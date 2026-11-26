import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addManualExpense, createExpenseDomainState, listManualExpenses, updateManualExpense, removeManualExpense, saveExpenseCatalogRecord, saveExpenseDomainState, loadExpenseDomainState, EXPENSE_DOMAIN_STORAGE_KEY, isExpenseNatureCompatible, parseExpenseDomainState, localExpenseDate } from './expenseDomain';
const input = { description: 'Almoço', amount: 50, categoryId: 'category-alimentacao', paymentMethodId: 'payment-pix', date: '2026-10-01', note: 'Teste' };
const cycleId = '2026-11-04';
test('CRUD avulso preserva ID, grupo e ciclo; data fora do ciclo não realoca a despesa', () => {
  let state = addManualExpense(createExpenseDomainState(), cycleId, 'carro', input);
  const item = state.cycles[cycleId][0];
  assert.equal(item.nature, 'avulso'); assert.equal(item.origin, 'manual'); assert.equal(item.group, 'carro'); assert.equal(item.definitionId, undefined);
  state = updateManualExpense(state, cycleId, item.id, { ...input, amount: 75, date: '2027-01-01' });
  assert.equal(state.cycles[cycleId][0].id, item.id); assert.equal(state.cycles[cycleId][0].amount, 75);
  assert.equal(state.cycles['2027-01-04'], undefined);
  assert.throws(() => updateManualExpense(state, '2026-12-04', item.id, input));
  state = removeManualExpense(state, cycleId, item.id); assert.equal(state.cycles[cycleId].length, 0);
});
test('cada ciclo e grupo possui sua lista isolada, ordenada por data recente primeiro', () => {
  let state = addManualExpense(createExpenseDomainState(), cycleId, 'casa', input);
  state = addManualExpense(state, cycleId, 'casa', { ...input, description: 'Mais recente', date: '2026-12-01' });
  state = addManualExpense(state, '2026-10-04', 'diarias', input);
  assert.equal(listManualExpenses(state, cycleId, 'casa')[0].description, 'Mais recente');
  assert.equal(listManualExpenses(state, cycleId, 'diarias').length, 0);
  assert.equal(listManualExpenses(state, '2026-10-04', 'diarias').length, 1);
});
test('valor maior que zero, descrição, categoria, pagamento e data são obrigatórios', () => {
  for (const updates of [{ amount: 0 }, { amount: -1 }, { amount: NaN }, { description: ' ' }, { categoryId: '' }, { paymentMethodId: '' }, { date: '' }, { date: '2026-02-30' }]) assert.throws(() => addManualExpense(createExpenseDomainState(), cycleId, 'diarias', { ...input, ...updates }));
});
for (const [group, allowed] of Object.entries({ carro: ['avulso', 'recorrente', 'parcelado'], casa: ['avulso', 'recorrente', 'parcelado'], fixos: ['recorrente'], parcelados: ['parcelado'], diarias: ['avulso'] })) {
  test(`compatibilidade de ${group} com as três naturezas`, () => {
    for (const nature of ['avulso', 'recorrente', 'parcelado']) assert.equal(isExpenseNatureCompatible(group, nature), allowed.includes(nature));
  });
}
test('recorrentes e parcelados exigem definição; avulsos não aceitam vínculo', () => {
  const state = addManualExpense(createExpenseDomainState(), cycleId, 'casa', input);
  for (const updates of [{ nature: 'recorrente' }, { nature: 'parcelado', installment: { number: 1, total: 3 } }, { definitionId: 'missing' }]) assert.throws(() => parseExpenseDomainState(JSON.stringify({ ...state, cycles: { [cycleId]: [{ ...state.cycles[cycleId][0], ...updates }] } })));
});
test('catálogos CRUD preservam IDs, referências e registros inativos no histórico', () => {
  let state = addManualExpense(createExpenseDomainState(), cycleId, 'casa', input);
  const item = state.cycles[cycleId][0];
  state = saveExpenseCatalogRecord(state, 'categories', { id: input.categoryId, name: 'Almoço alterado', active: false });
  state = saveExpenseCatalogRecord(state, 'paymentMethods', { id: input.paymentMethodId, name: 'Pix alterado', type: 'pix', active: false });
  assert.equal(state.cycles[cycleId][0].categoryId, input.categoryId);
  assert.throws(() => addManualExpense(state, cycleId, 'casa', input));
  state = updateManualExpense(state, cycleId, item.id, { ...input, amount: 80 });
  assert.equal(state.cycles[cycleId][0].amount, 80);
  state = saveExpenseCatalogRecord(state, 'categories', { id: input.categoryId, name: 'Almoço alterado', active: true });
  state = saveExpenseCatalogRecord(state, 'paymentMethods', { id: input.paymentMethodId, name: 'Pix alterado', type: 'pix', active: true });
  assert.equal(addManualExpense(state, cycleId, 'diarias', input).cycles[cycleId].length, 2);
  state = saveExpenseCatalogRecord(state, 'categories', { name: 'Nova', active: true });
  assert.ok(Object.values(state.categories).find(value => value.name === 'Nova')?.id);
  assert.throws(() => saveExpenseCatalogRecord(state, 'paymentMethods', { name: ' ', type: 'pix', active: true }));
});
test('persistência manual mantém legado byte a byte e recupera ciclos anteriores', () => {
  const values = new Map([['finance-tracker-data', 'original']]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const state = addManualExpense(createExpenseDomainState(), '2026-10-04', 'casa', input);
  saveExpenseDomainState(storage, state);
  assert.deepEqual(loadExpenseDomainState(storage), state); assert.equal(values.get('finance-tracker-data'), 'original');
});
test('Investimento sai dos seeds; registro antigo referenciado é preservado e desativado', () => {
  assert.equal(createExpenseDomainState().categories['category-investimento'], undefined);
  const state = createExpenseDomainState();
  state.categories['category-investimento'] = { id: 'category-investimento', name: 'Investimento', active: true };
  const values = new Map([[EXPENSE_DOMAIN_STORAGE_KEY, JSON.stringify(state)]]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  assert.equal(loadExpenseDomainState(storage).categories['category-investimento'], undefined);
  const historical = addManualExpense(state, cycleId, 'casa', { ...input, categoryId: 'category-investimento' });
  values.set(EXPENSE_DOMAIN_STORAGE_KEY, JSON.stringify(historical));
  assert.equal(loadExpenseDomainState(storage).categories['category-investimento'].active, false);
  assert.equal(loadExpenseDomainState(storage).cycles[cycleId][0].categoryId, 'category-investimento');
});
test('data inicial usa dia civil local, inclusive à noite', () => {
  assert.equal(localExpenseDate(new Date(2026, 10, 20, 22, 58)), '2026-11-20');
});