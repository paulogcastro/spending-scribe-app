import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createExpenseDomainState, deactivateExpenseCatalogRecord, EXPENSE_DOMAIN_STORAGE_KEY, loadExpenseDomainState, parseExpenseDomainState, saveExpenseDomainState, type ExpenseOccurrence } from './expenseDomain';

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}
const occurrence: ExpenseOccurrence = { id: 'expense-1', cycleId: '2026-11-04', description: 'Compra', amount: 50, group: 'diarias', nature: 'avulso', categoryId: 'category-alimentacao', paymentMethodId: 'payment-credito', date: '2026-11-05', origin: 'manual', note: 'Observação' };
function withOccurrence() {
  const state = createExpenseDomainState();
  state.cycles[occurrence.cycleId] = [{ ...occurrence }];
  return state;
}
const parse = (value: unknown) => parseExpenseDomainState(JSON.stringify(value));

test('seeds têm IDs estáveis, três cartões independentes, Pix, Dinheiro e Outros', () => {
  const state = createExpenseDomainState();
  assert.deepEqual(state, createExpenseDomainState());
  assert.equal(Object.keys(state.paymentMethods).length, 6);
  assert.equal(Object.values(state.paymentMethods).filter(value => value.type === 'cartao_credito').length, 3);
  assert.equal(state.paymentMethods['payment-pix'].type, 'pix');
  assert.equal(state.paymentMethods['payment-dinheiro'].type, 'dinheiro');
  assert.equal(state.paymentMethods['payment-outros'].type, 'outros');
  assert.deepEqual(state.cycles, {});
});

test('estrutura preserva descrição, valor, grupo, natureza, categoria, pagamento, origem e nota', () => {
  assert.deepEqual(parse(withOccurrence()).cycles[occurrence.cycleId][0], occurrence);
  for (const origin of ['manual', 'importacao', 'notificacao'] as const) {
    const state = withOccurrence();
    state.cycles[occurrence.cycleId][0].origin = origin;
    assert.equal(parse(state).cycles[occurrence.cycleId][0].origin, origin);
  }
});

test('categoria e natureza são independentes; ocorrência tem exatamente um dos cinco grupos', () => {
  for (const group of ['carro', 'casa', 'diarias'] as const) {
    const state = withOccurrence();
    state.cycles[occurrence.cycleId][0].group = group;
    assert.equal(parse(state).cycles[occurrence.cycleId][0].categoryId, 'category-alimentacao');
    assert.equal(parse(state).cycles[occurrence.cycleId][0].nature, 'avulso');
  }
  assert.throws(() => parse({ ...withOccurrence(), cycles: { [occurrence.cycleId]: [{ ...occurrence, group: ['casa', 'carro'] }] } }));
  assert.throws(() => parse({ ...withOccurrence(), cycles: { [occurrence.cycleId]: [{ ...occurrence, group: 'outros' }] } }));
});

test('referências inexistentes, chaves diferentes dos IDs e duplicações entre ciclos são rejeitadas', () => {
  for (const updates of [{ categoryId: 'missing' }, { paymentMethodId: 'missing' }, { id: '' }, { cycleId: '2026-12-04' }]) {
    assert.throws(() => parse({ ...withOccurrence(), cycles: { [occurrence.cycleId]: [{ ...occurrence, ...updates }] } }));
  }
  const state = withOccurrence();
  state.cycles['2026-12-04'] = [{ ...occurrence, cycleId: '2026-12-04', date: '2026-12-05' }];
  assert.throws(() => parse(state));
  assert.throws(() => parse({ ...createExpenseDomainState(), categories: { wrong: { id: 'right', name: 'Categoria', active: true } } }));
});

test('datas civis inválidas são rejeitadas e datas fora do ciclo são aceitas', () => {
  for (const date of ['2026-11-31', '2026-11-00']) {
    assert.throws(() => parse({ ...withOccurrence(), cycles: { [occurrence.cycleId]: [{ ...occurrence, date }] } }));
  }
  for (const date of ['2026-11-03', '2026-12-04']) assert.equal(parse({ ...withOccurrence(), cycles: { [occurrence.cycleId]: [{ ...occurrence, date }] } }).cycles[occurrence.cycleId][0].date, date);
  assert.equal(parse({ ...withOccurrence(), cycles: { [occurrence.cycleId]: [{ ...occurrence, date: '2026-12-03' }] } }).cycles[occurrence.cycleId][0].date, '2026-12-03');
  assert.throws(() => parse({ ...withOccurrence(), cycles: { '2026-02-04': [{ ...occurrence, cycleId: '2026-02-04', date: '2026-02-29' }] } }));
  assert.equal(parse({ ...withOccurrence(), cycles: { '2028-02-04': [{ ...occurrence, cycleId: '2028-02-04', date: '2028-02-29' }] } }).cycles['2028-02-04'][0].date, '2028-02-29');
});

test('valores inválidos, versões desconhecidas, dados sensíveis e campos extras são rejeitados', () => {
  assert.throws(() => parse({ ...withOccurrence(), cycles: { [occurrence.cycleId]: [{ ...occurrence, amount: -1 }] } }));
  assert.throws(() => parse({ ...withOccurrence(), version: 2 }));
  const state = createExpenseDomainState();
  assert.throws(() => parse({ ...state, paymentMethods: { card: { id: 'card', name: 'Cartão', type: 'cartao_credito', active: true, cardNumber: 'not-stored' } } }));
  assert.throws(() => parse({ ...state, unexpected: true }));
});

test('catálogos dinâmicos aceitam múltiplos cartões e categorias sem relação com grupo', () => {
  const state = withOccurrence();
  state.categories['custom-category'] = { id: 'custom-category', name: 'Viagens', active: true };
  state.paymentMethods['another-inter'] = { id: 'another-inter', name: 'Outro Inter', active: true, type: 'cartao_credito' };
  state.cycles[occurrence.cycleId][0].categoryId = 'custom-category';
  state.cycles[occurrence.cycleId][0].paymentMethodId = 'another-inter';
  assert.equal(parse(state).cycles[occurrence.cycleId][0].paymentMethodId, 'another-inter');
});

test('desativação mantém IDs e referências históricas, sem exclusão física', () => {
  const original = withOccurrence();
  let state = deactivateExpenseCatalogRecord(original, 'categories', occurrence.categoryId);
  state = deactivateExpenseCatalogRecord(state, 'paymentMethods', occurrence.paymentMethodId);
  assert.equal(state.categories[occurrence.categoryId].active, false);
  assert.equal(state.paymentMethods[occurrence.paymentMethodId].active, false);
  assert.deepEqual(state.cycles[occurrence.cycleId][0], occurrence);
  assert.equal(original.categories[occurrence.categoryId].active, true);
  assert.throws(() => deactivateExpenseCatalogRecord(state, 'categories', 'missing'));
});

test('persistência recupera todo o domínio e não escreve em legado, ciclos ou planejamento', () => {
  const storage = memory({ 'finance-tracker-data': 'legacy', 'spending-scribe-financial-cycles-v1': 'cycles', 'spending-scribe-cycle-planning-v1': 'planning' });
  assert.deepEqual(loadExpenseDomainState(storage), createExpenseDomainState());
  assert.equal(storage.getItem(EXPENSE_DOMAIN_STORAGE_KEY), null);
  const state = withOccurrence();
  saveExpenseDomainState(storage, state);
  assert.deepEqual(loadExpenseDomainState(storage), state);
  assert.equal(storage.getItem('finance-tracker-data'), 'legacy');
  assert.equal(storage.getItem('spending-scribe-financial-cycles-v1'), 'cycles');
  assert.equal(storage.getItem('spending-scribe-cycle-planning-v1'), 'planning');
});

test('leitura e gravação não sobrescrevem conteúdo inválido armazenado', () => {
  for (const text of ['not-json', '{"version":2}', '{"version":1}']) {
    const storage = memory({ [EXPENSE_DOMAIN_STORAGE_KEY]: text });
    assert.throws(() => loadExpenseDomainState(storage));
    assert.throws(() => saveExpenseDomainState(storage, withOccurrence()));
    assert.equal(storage.getItem(EXPENSE_DOMAIN_STORAGE_KEY), text);
  }
  const storage = memory();
  assert.throws(() => saveExpenseDomainState(storage, { ...withOccurrence(), version: 2 } as never));
  assert.equal(storage.getItem(EXPENSE_DOMAIN_STORAGE_KEY), null);
});

test('gravação rejeita remover catálogo usado anteriormente mesmo removendo ocorrências no mesmo envio', () => {
  const storage = memory();
  saveExpenseDomainState(storage, withOccurrence());
  const before = storage.getItem(EXPENSE_DOMAIN_STORAGE_KEY);
  for (const catalog of ['categories', 'paymentMethods'] as const) {
    const next = createExpenseDomainState();
    delete next[catalog][catalog === 'categories' ? occurrence.categoryId : occurrence.paymentMethodId];
    assert.throws(() => saveExpenseDomainState(storage, next));
    assert.equal(storage.getItem(EXPENSE_DOMAIN_STORAGE_KEY), before);
  }
});

test('definições permanentes validadas não geram ocorrências automaticamente', () => {
  const state = createExpenseDomainState();
  const common = { id: 'rent', description: 'Aluguel', amount: 1000, group: 'casa' as const, categoryId: 'category-moradia', paymentMethodId: 'payment-pix', active: true, startDate: '2026-11-01' };
  state.recurringDefinitions.rent = { ...common, dayOfMonth: 5 };
  state.installmentDefinitions.purchase = { ...common, id: 'purchase', totalInstallments: 12 };
  assert.deepEqual(parse(state).cycles, {});
  assert.throws(() => parse({ ...state, recurringDefinitions: { rent: { ...common, dayOfMonth: 32 } } }));
  assert.throws(() => parse({ ...state, installmentDefinitions: { purchase: { ...common, id: 'purchase', totalInstallments: 0 } } }));
  assert.throws(() => parse({ ...state, recurringDefinitions: { rent: { ...common, dayOfMonth: 5, categoryId: 'missing' } } }));
});

test('referência permanente respeita natureza e um único grupo', () => {
  const state = withOccurrence();
  state.recurringDefinitions.lunch = { id: 'lunch', description: 'Almoço', amount: 50, group: 'carro', categoryId: occurrence.categoryId, paymentMethodId: occurrence.paymentMethodId, active: false, startDate: '2026-11-01', dayOfMonth: 5 };
  state.cycles[occurrence.cycleId][0] = { ...occurrence, group: 'carro', nature: 'recorrente', definitionId: 'lunch' };
  assert.equal(parse(state).cycles[occurrence.cycleId][0].definitionId, 'lunch');
  state.recurringDefinitions.lunch.group = 'casa';
  assert.throws(() => parse(state));
  state.recurringDefinitions.lunch.group = 'carro';
  state.cycles[occurrence.cycleId][0].definitionId = 'missing';
  assert.throws(() => parse(state));
  state.cycles[occurrence.cycleId][0] = { ...occurrence, definitionId: 'lunch' };
  assert.throws(() => parse(state));
});

test('parcelas exigem natureza parcelado, número e total inteiros válidos e definição compatível', () => {
  const state = withOccurrence();
  state.installmentDefinitions.purchase = { id: 'purchase', description: 'Compra', amount: 50, group: 'carro', categoryId: occurrence.categoryId, paymentMethodId: occurrence.paymentMethodId, active: true, startDate: '2026-11-05', totalInstallments: 12 };
  state.cycles[occurrence.cycleId][0] = { ...occurrence, group: 'carro', nature: 'parcelado', definitionId: 'purchase', installment: { number: 1, total: 12 } };
  assert.equal(parse(state).cycles[occurrence.cycleId][0].installment?.total, 12);
  for (const installment of [{ number: 0, total: 12 }, { number: 13, total: 12 }, { number: 1.5, total: 12 }, { number: 1, total: 10 }]) {
    assert.throws(() => parse({ ...state, cycles: { [occurrence.cycleId]: [{ ...state.cycles[occurrence.cycleId][0], installment }] } }));
  }
  assert.throws(() => parse({ ...state, cycles: { [occurrence.cycleId]: [{ ...occurrence, nature: 'parcelado' }] } }));
  assert.throws(() => parse({ ...state, cycles: { [occurrence.cycleId]: [{ ...occurrence, installment: { number: 1, total: 12 } }] } }));
});