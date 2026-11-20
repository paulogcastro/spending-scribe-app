import { test } from 'node:test';
import assert from 'node:assert/strict';
import { financialPeriods } from './financialPeriods';

test('o ciclo 04/11–03/12 aponta registros de novembro inteiro, não registros do ciclo', () => {
  const periods = financialPeriods('2026-11-04');
  assert.equal(periods.monthly.yearMonth, '2026-11');
  assert.equal(periods.monthly.year, 2026);
  assert.equal(periods.monthly.month, 10);
  assert.equal(periods.monthly.startDate, '2026-11-01');
  assert.equal(periods.monthly.endDate, '2026-12-01');
  assert.equal(periods.cycle.startDate, '2026-11-04');
  assert.equal(periods.cycle.endDate, '2026-12-04');
  assert.notEqual(periods.monthly.startDate, periods.cycle.startDate);
  assert.notEqual(periods.monthly.endDate, periods.cycle.endDate);
});

test('o mês legado continua civil na virada de ano e em fevereiro bissexto', () => {
  const december = financialPeriods('2026-12-04');
  assert.equal(december.monthly.endDate, '2027-01-01');
  assert.equal(december.cycle.endDate, '2027-01-04');
  const february = financialPeriods('2028-02-04');
  assert.equal(february.monthly.startDate, '2028-02-01');
  assert.equal(february.monthly.endDate, '2028-03-01');
  assert.equal(february.cycle.endDate, '2028-03-04');
});