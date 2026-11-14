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