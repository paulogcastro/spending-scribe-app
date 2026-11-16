import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adjacentCycle, CLOSING_REFERENCE_DAY, CYCLE_STORAGE_KEY, createFinancialCycle, cycleDisplayEndDate, getFinancialCycle, legacyMonthForCycle, loadCycleState, parseCycleState, saveCycleState, selectFinancialCycle } from './financialCycles';

test('days 1–3 belong to the preceding cycle and day 4 starts the next', () => {
  for (const day of [1, 2, 3]) assert.equal(getFinancialCycle(new Date(2026, 10, day)).id, '2026-10-04');
  for (const day of [4, 9, 15, 30]) assert.equal(getFinancialCycle(new Date(2026, 10, day)).id, '2026-11-04');
  assert.equal(CLOSING_REFERENCE_DAY, 9);
});

test('the local midnight boundary on day 4 belongs only to the new cycle', () => {
  assert.equal(getFinancialCycle(new Date(2026, 11, 3, 23, 59, 59)).id, '2026-11-04');
  assert.equal(getFinancialCycle(new Date(2026, 11, 4, 0, 0, 0)).id, '2026-12-04');
});

test('navigation crosses the year in both directions', () => {
  assert.equal(adjacentCycle('2026-12-04', 1).id, '2027-01-04');
  assert.equal(adjacentCycle('2027-01-04', -1).id, '2026-12-04');
  assert.equal(getFinancialCycle(new Date(2027, 0, 3)).id, '2026-12-04');
});

test('28, 29, 30 and 31 day months retain exact day-4 boundaries', () => {
  for (const [year, month, lastDay, end] of [
    [2026, 1, 28, '2026-03-04'], [2028, 1, 29, '2028-03-04'],
    [2026, 3, 30, '2026-05-04'], [2026, 0, 31, '2026-02-04'],
  ] as const) {
    const cycle = getFinancialCycle(new Date(year, month, lastDay));
    assert.equal(cycle.startDate, `${year}-${String(month + 1).padStart(2, '0')}-04`);
    assert.equal(cycle.endDate, end);
  }
});

test('consecutive cycles have an exclusive shared boundary without overlap', () => {
  let cycle = createFinancialCycle('2026-01-04');
  for (let i = 0; i < 36; i++) {
    const next = adjacentCycle(cycle.id, 1);
    assert.equal(cycle.endDate, next.startDate);
    assert.ok(cycle.startDate < cycle.endDate);
    assert.equal(adjacentCycle(next.id, -1).id, cycle.id);
    cycle = next;
  }
});

test('cycles and selection persist independently while legacy data is untouched', () => {
  const oldMonths = '{"2026-11":{"income":[{"actual":5000}]}}';
  const values = new Map([['finance-tracker-data', oldMonths], ['finance-import-categories', '{"loja":"outros"}']]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const initial = loadCycleState(storage, new Date(2026, 10, 15));
  assert.deepEqual(Object.keys(initial.cycles), ['2026-11-04']);
  const next = selectFinancialCycle(initial, adjacentCycle(initial.selectedCycleId, 1));
  saveCycleState(storage, next);
  assert.deepEqual(loadCycleState(storage, new Date(2027, 0, 1)), next);
  assert.equal(loadCycleState(storage).selectedCycleId, '2026-12-04');
  assert.equal(Object.keys(next.cycles).length, 2);
  assert.equal(values.get('finance-tracker-data'), oldMonths);
  assert.equal(values.get('finance-import-categories'), '{"loja":"outros"}');
  assert.ok(values.has(CYCLE_STORAGE_KEY));
});

test('invalid metadata cannot be loaded as valid cycles', () => {
  assert.throws(() => createFinancialCycle('2026-11-09'));
  assert.throws(() => getFinancialCycle(new Date(NaN)));
  assert.throws(() => parseCycleState('{}'));
  assert.throws(() => parseCycleState(JSON.stringify({ version: 1, selectedCycleId: '2026-11-04', cycles: { '2026-11-04': { id: '2026-11-04', startDate: '2026-11-04', endDate: '2026-12-05' } } })));
});

test('the displayed end date is the last effective day, one before the exclusive limit', () => {
  assert.equal(cycleDisplayEndDate('2026-11-04'), '2026-12-03');
  assert.equal(cycleDisplayEndDate('2026-12-04'), '2027-01-03');
  assert.equal(cycleDisplayEndDate('2026-01-04'), '2026-02-03');
  assert.equal(cycleDisplayEndDate('2026-02-04'), '2026-03-03');
  assert.equal(cycleDisplayEndDate('2028-02-04'), '2028-03-03');
  assert.equal(cycleDisplayEndDate('2026-04-04'), '2026-05-03');
});

test('displaying the end date never changes the internal exclusive limit', () => {
  for (const id of ['2026-11-04', '2026-12-04', '2026-02-04', '2028-02-04']) {
    const cycle = createFinancialCycle(id);
    cycleDisplayEndDate(id);
    assert.deepEqual(createFinancialCycle(id), cycle);
    assert.equal(cycle.endDate, adjacentCycle(id, 1).startDate);
  }
});

test('compatibility points to the start calendar month without migrating records', () => {
  assert.deepEqual(legacyMonthForCycle('2026-11-04'), { year: 2026, month: 10 });
  assert.deepEqual(legacyMonthForCycle('2027-01-04'), { year: 2027, month: 0 });
});