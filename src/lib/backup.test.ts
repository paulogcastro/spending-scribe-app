import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup } from './backup';

const month = { yearMonth: '2026-11', income: [{ id: 'salary', description: 'Salário', actual: 5000, planned: 0 }], casa: [], carro: [], parcelados: [], diarias: [{ id: 'purchase', description: 'Almoço', amount: 50, category: 'almoco', source: 'inter_credito', date: '2026-11-14', createdAt: '2026-11-14T00:00:00Z', importKey: 'test-key', note: 'Teste' }], investments: [], investmentGoal: 500, expenseGoals: { casa: 1000, carro: 300, parcelados: 400, diarias: 1000 } };
const backup = { version: 1, exportedAt: '2026-11-14T00:00:00Z', months: { '2026-11': month }, merchantCategories: { restaurante: 'almoco' } };
test('backup preserves amounts, goals, notes, import identifiers and merchant categories', () => {
  const result = parseBackup(JSON.stringify(backup));
  assert.equal(result.months['2026-11'].income[0].actual, 5000);
  assert.equal(result.months['2026-11'].diarias[0].amount, 50);
  assert.equal(result.months['2026-11'].diarias[0].importKey, 'test-key');
  assert.equal(result.months['2026-11'].diarias[0].note, 'Teste');
  assert.equal(result.months['2026-11'].expenseGoals.diarias, 1000);
  assert.equal(result.merchantCategories.restaurante, 'almoco');
});
test('invalid files and unsupported versions cannot replace current data', () => {
  assert.throws(() => parseBackup('not json'));
  assert.throws(() => parseBackup(JSON.stringify({ ...backup, version: 2 })));
  assert.throws(() => parseBackup(JSON.stringify({ ...backup, months: { '2026-10': month } })));
  assert.throws(() => parseBackup(JSON.stringify({ ...backup, months: { '2026-11': { ...month, investmentGoal: -50 } } })));
});
import { applyBackup, buildBackup, isLegacyBackup, MONTHS_STORAGE_KEY, MERCHANT_STORAGE_KEY } from './backup';
import { CYCLE_STORAGE_KEY } from './financialCycles';
import { PLANNING_STORAGE_KEY, createEmptyPlanning, updateExtraIncome } from './cyclePlanning';

function memory(initial: Record<string, string> = {}, failOn?: string) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { if (k === failOn) throw new Error('quota'); data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } };
}
const cycleState = { version: 1, selectedCycleId: '2026-12-04', cycles: { '2026-11-04': { id: '2026-11-04', startDate: '2026-11-04', endDate: '2026-12-04' }, '2026-12-04': { id: '2026-12-04', startDate: '2026-12-04', endDate: '2027-01-04' } } };
const planA = { ...createEmptyPlanning('2026-11-04'), plannedSalary: 6000, receivedSalary: 5800, investmentBaseGoal: 1000, extraIncomes: [{ id: 'x', description: 'Freela', amount: 300 }], distribution: { carro: 10, casa: 20, fixos: 15, parcelados: 5 } };
const planB = { ...createEmptyPlanning('2026-12-04'), plannedSalary: 7000, investmentBaseGoal: 500 };
const planning = { version: 1, plans: { '2026-11-04': planA, '2026-12-04': planB } };
const full = () => memory({ [CYCLE_STORAGE_KEY]: JSON.stringify(cycleState), [PLANNING_STORAGE_KEY]: JSON.stringify(planning), [MERCHANT_STORAGE_KEY]: '{"padaria":"alimentacao"}' });

test('export includes every cycle planning and the cycle state with selected cycle', () => {
  const b = buildBackup(full(), { '2026-11': month as never });
  assert.equal(b.version, 3);
  assert.ok(b.cyclePlanning);
  assert.ok(b.cycleState);
  assert.deepEqual(Object.keys(b.cyclePlanning.plans).sort(), ['2026-11-04', '2026-12-04']);
  assert.equal(b.cyclePlanning.plans['2026-11-04'].receivedSalary, 5800);
  assert.equal(b.cyclePlanning.plans['2026-11-04'].extraIncomes[0].amount, 300);
  assert.equal(b.cyclePlanning.plans['2026-11-04'].distribution.casa, 20);
  assert.equal(b.cycleState.selectedCycleId, '2026-12-04');
  assert.equal(b.months['2026-11'].income[0].actual, 5000);
  assert.equal(b.merchantCategories.padaria, 'alimentacao');
});
test('full backup restores months, categories, cycles and planning', () => {
  const b = buildBackup(full(), { '2026-11': month as never });
  const target = memory();
  assert.equal(applyBackup(target, b).legacy, false);
  assert.equal(JSON.parse(target.getItem(PLANNING_STORAGE_KEY) ?? 'null').plans['2026-12-04'].plannedSalary, 7000);
  assert.equal(JSON.parse(target.getItem(CYCLE_STORAGE_KEY) ?? 'null').selectedCycleId, '2026-12-04');
  assert.equal(JSON.parse(target.getItem(MONTHS_STORAGE_KEY) ?? 'null')['2026-11'].diarias[0].amount, 50);
});
test('legacy backup restores months but preserves current cycles and planning', () => {
  const target = full();
  const before = { c: target.getItem(CYCLE_STORAGE_KEY), p: target.getItem(PLANNING_STORAGE_KEY) };
  const legacy = parseBackup(JSON.stringify(backup));
  assert.equal(isLegacyBackup(legacy), true);
  assert.equal(applyBackup(target, legacy).legacy, true);
  assert.equal(target.getItem(CYCLE_STORAGE_KEY), before.c);
  assert.equal(target.getItem(PLANNING_STORAGE_KEY), before.p);
  assert.equal(JSON.parse(target.getItem(MONTHS_STORAGE_KEY) ?? 'null')['2026-11'].income[0].actual, 5000);
});
test('failed restore keeps all previous data', () => {
  const b = buildBackup(full(), { '2026-11': month as never });
  const target = memory({ [MONTHS_STORAGE_KEY]: '{}', [PLANNING_STORAGE_KEY]: '{"version":1,"plans":{}}' }, PLANNING_STORAGE_KEY);
  assert.throws(() => applyBackup(target, b));
  assert.equal(target.getItem(MONTHS_STORAGE_KEY), '{}');
  assert.equal(target.getItem(CYCLE_STORAGE_KEY), null);
  assert.equal(target.getItem(MERCHANT_STORAGE_KEY), null);
});
test('v2 backup with invalid planning or missing cycles is rejected before writing', () => {
  const b = buildBackup(full(), { '2026-11': month as never });
  const bad = { ...b, cyclePlanning: { version: 1, plans: { '2026-11-04': { ...planA, investmentBaseGoal: 9000 } } } };
  assert.throws(() => parseBackup(JSON.stringify(bad)));
  assert.throws(() => parseBackup(JSON.stringify({ ...b, cycleState: undefined })));
});
test('extra income description cannot be saved empty or blank', () => {
  assert.throws(() => updateExtraIncome(planA, 'x', { description: '   ' }));
  assert.equal(updateExtraIncome(planA, 'x', { description: ' Bônus ' }).extraIncomes[0].description, 'Bônus');
});
