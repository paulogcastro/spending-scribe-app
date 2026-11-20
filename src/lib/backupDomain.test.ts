import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyBackup, buildBackup, MONTHS_STORAGE_KEY, MERCHANT_STORAGE_KEY, parseBackup } from './backup';
import { createExpenseDomainState, EXPENSE_DOMAIN_STORAGE_KEY } from './expenseDomain';
import { CYCLE_STORAGE_KEY, createFinancialCycle } from './financialCycles';
import { PLANNING_STORAGE_KEY, createEmptyPlanning } from './cyclePlanning';
import type { MonthlyData } from '../types/finance';

const months: Record<string, MonthlyData> = { '2026-11': { yearMonth: '2026-11', income: [], casa: [], carro: [], parcelados: [], diarias: [], investments: [], investmentGoal: 0, expenseGoals: { casa: 0, carro: 0, parcelados: 0, diarias: 0 } } };
const cycle = createFinancialCycle('2026-11-04');
const seed = () => ({
  [MONTHS_STORAGE_KEY]: JSON.stringify(months), [MERCHANT_STORAGE_KEY]: '{"padaria":"alimentacao"}',
  [CYCLE_STORAGE_KEY]: JSON.stringify({ version: 1, selectedCycleId: cycle.id, cycles: { [cycle.id]: cycle } }),
  [PLANNING_STORAGE_KEY]: JSON.stringify({ version: 1, plans: { [cycle.id]: createEmptyPlanning(cycle.id) } }),
  [EXPENSE_DOMAIN_STORAGE_KEY]: JSON.stringify(createExpenseDomainState()),
});
function memory(initial: Record<string, string> = {}, failKey?: string, once = false) {
  const data = new Map(Object.entries(initial));
  let failed = false;
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { if (key === failKey && (!once || !failed)) { failed = true; throw new Error('quota'); } data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
}

test('exportação v3 inclui o domínio completo sem modificar outras chaves', () => {
  const storage = memory(seed());
  const state = createExpenseDomainState();
  state.cycles[cycle.id] = [{ id: 'e', cycleId: cycle.id, description: 'Compra', amount: 25, group: 'casa', nature: 'avulso', categoryId: 'category-hobbies', paymentMethodId: 'payment-inter', date: '2026-11-05', origin: 'importacao' }];
  storage.setItem(EXPENSE_DOMAIN_STORAGE_KEY, JSON.stringify(state));
  const before = [...storage.data];
  const backup = buildBackup(storage, months);
  assert.equal(backup.version, 3);
  assert.deepEqual(backup.expenseDomain, state);
  assert.deepEqual(backup.months, months);
  assert.deepEqual([...storage.data], before);
});

test('restauração v3 recupera todas as cinco chaves', () => {
  const source = memory(seed());
  const backup = buildBackup(source, months);
  const target = memory();
  applyBackup(target, backup);
  for (const [key, value] of source.data) assert.deepEqual(JSON.parse(target.getItem(key) ?? 'null'), JSON.parse(value));
});

test('v1 preserva byte a byte domínio novo, ciclos e planejamento atuais', () => {
  const target = memory(seed());
  const previous = new Map(target.data);
  applyBackup(target, parseBackup(JSON.stringify({ version: 1, exportedAt: '', months: {}, merchantCategories: {} })));
  assert.equal(target.getItem(MONTHS_STORAGE_KEY), '{}');
  for (const key of [EXPENSE_DOMAIN_STORAGE_KEY, CYCLE_STORAGE_KEY, PLANNING_STORAGE_KEY]) assert.equal(target.getItem(key), previous.get(key));
});

test('v2 restaura os domínios antigos sem apagar o novo domínio presente nem criar um ausente', () => {
  const v3 = buildBackup(memory(seed()), months);
  const { expenseDomain, ...previous } = v3;
  assert.ok(expenseDomain);
  const backup = parseBackup(JSON.stringify({ ...previous, version: 2 }));
  for (const existing of [true, false]) {
    const target = memory(existing ? seed() : {});
    const before = target.getItem(EXPENSE_DOMAIN_STORAGE_KEY);
    applyBackup(target, backup);
    assert.equal(target.getItem(EXPENSE_DOMAIN_STORAGE_KEY), before);
    assert.deepEqual(JSON.parse(target.getItem(MONTHS_STORAGE_KEY) ?? 'null'), months);
  }
});

test('backup v3 incompleto, versão desconhecida ou referências inválidas falham antes de qualquer gravação', () => {
  const valid = buildBackup(memory(seed()), months);
  const state = createExpenseDomainState();
  state.cycles[cycle.id] = [{ id: 'e', cycleId: cycle.id, description: 'Compra', amount: 25, group: 'casa', nature: 'avulso', categoryId: 'missing', paymentMethodId: 'payment-inter', date: '2026-11-05', origin: 'manual' }];
  const target = memory(seed());
  const before = [...target.data];
  for (const invalid of [{ ...valid, expenseDomain: undefined }, { ...valid, cyclePlanning: undefined }, { ...valid, version: 4 }, { ...valid, expenseDomain: state }]) {
    assert.throws(() => applyBackup(target, invalid as never));
    assert.deepEqual([...target.data], before);
  }
});

test('domínio armazenado inválido bloqueia exportação e sobrescrita v3, preservando o original', () => {
  const target = memory({ ...seed(), [EXPENSE_DOMAIN_STORAGE_KEY]: 'invalid-original' });
  const before = [...target.data];
  assert.throws(() => buildBackup(target, months));
  assert.throws(() => applyBackup(target, buildBackup(memory(seed()), months)));
  assert.deepEqual([...target.data], before);
});

test('falha em cada chave reverte todas as gravações v3 com e sem domínio anterior', () => {
  const backup = buildBackup(memory(seed()), months);
  for (const failKey of Object.keys(seed())) {
    for (const populated of [true, false]) {
      const initial = populated ? { ...seed(), [MONTHS_STORAGE_KEY]: '{}', [MERCHANT_STORAGE_KEY]: '{}', [PLANNING_STORAGE_KEY]: '{"version":1,"plans":{}}' } : {};
      const target = memory(initial, failKey, true);
      const before = new Map(target.data);
      assert.throws(() => applyBackup(target, backup));
      assert.deepEqual(target.data, before);
    }
  }
});

test('falha persistente na última chave ainda recupera meses, categorias, ciclos e planejamento', () => {
  const backup = buildBackup(memory(seed()), months);
  const target = memory({ [MONTHS_STORAGE_KEY]: '{}', [EXPENSE_DOMAIN_STORAGE_KEY]: JSON.stringify(createExpenseDomainState()) }, EXPENSE_DOMAIN_STORAGE_KEY);
  const before = new Map(target.data);
  assert.throws(() => applyBackup(target, backup));
  assert.deepEqual(target.data, before);
});