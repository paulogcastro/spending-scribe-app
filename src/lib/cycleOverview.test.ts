import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCycleOverview, getCyclePace } from './cycleOverview';
import { createEmptyPlanning } from './cyclePlanning';
import { createExpenseDomainState, type ExpenseOccurrence } from './expenseDomain';

const local = (year: number, month: number, day: number) => new Date(year, month - 1, day, 22, 30);
test('04–03 inclui hoje e exclui o limite dia 04; semanal é limitado aos dias restantes', () => {
  assert.equal(getCyclePace('2026-11-04', 300, 0, local(2026, 11, 4)).daysRemaining, 30);
  const pace = getCyclePace('2026-11-04', 300, 60, local(2026, 11, 22));
  assert.equal(pace.daysRemaining, 12);
  assert.equal(pace.remaining, 240);
  assert.equal(pace.daily, 20);
  assert.equal(pace.weekly, 140);
  const last = getCyclePace('2026-11-04', 300, 260, local(2026, 12, 3));
  assert.equal(last.daysRemaining, 1);
  assert.equal(last.weekly, 40);
  const closed = getCyclePace('2026-11-04', 300, 260, local(2026, 12, 4));
  assert.equal(closed.daysRemaining, 0);
  assert.equal(closed.daily, 0);
  assert.equal(closed.weekly, 0);
  assert.equal(closed.status, 'closed');
});
test('ciclo futuro usa período inteiro; fevereiro bissexto e virada do ano', () => {
  assert.equal(getCyclePace('2028-02-04', 290, 0, local(2028, 1, 1)).daysRemaining, 29);
  assert.equal(getCyclePace('2027-02-04', 280, 0, local(2027, 2, 4)).daysRemaining, 28);
  assert.equal(getCyclePace('2026-12-04', 310, 0, local(2026, 12, 31)).daysRemaining, 4);
  assert.equal(getCyclePace('2028-02-04', 290, 0, local(2028, 1, 1)).status, 'future');
});
test('meta ultrapassada preserva excesso e não permite disponibilidade negativa; sem meta', () => {
  const over = getCyclePace('2026-11-04', 100, 150, local(2026, 11, 22));
  assert.equal(over.remaining, -50);
  assert.equal(over.daily, 0);
  assert.equal(over.weekly, 0);
  const unset = getCyclePace('2026-11-04', 0, 50, local(2026, 11, 22));
  assert.equal(unset.hasGoal, false);
  assert.equal(unset.daily, 0);
});
test('indicadores usam só o ciclo indexado, suas cinco metas e reserva, sem projeções ou realizações mensais', () => {
  const plan = { ...createEmptyPlanning('2026-11-04'), plannedSalary: 3000, receivedSalary: 2800,
    investmentBaseGoal: 600, extraIncomes: [{ id: 'extra', description: 'Extra', amount: 200 }],
    distribution: { carro: 10, casa: 20, fixos: 10, parcelados: 10 } };
  const domain = createExpenseDomainState();
  const item: ExpenseOccurrence = { id: 'a', cycleId: plan.cycleId, description: 'Compra', amount: 60,
    group: 'diarias', nature: 'avulso', origin: 'manual', date: '2027-01-01', categoryId: 'category-almoco', paymentMethodId: 'payment-inter' };
  domain.cycles[plan.cycleId] = [item, { ...item, id: 'b', group: 'casa', amount: 300 }];
  domain.cycles['2026-10-04'] = [{ ...item, id: 'c', cycleId: '2026-10-04', amount: 999 }];
  const summary = computeCycleOverview(plan, domain, local(2026, 11, 22));
  assert.equal(summary.income, 3000);
  assert.equal(summary.expenses, 360);
  assert.equal(summary.mainExpenseGoal, 2400);
  assert.equal(summary.expenseRemaining, 2040);
  assert.equal(summary.totalInvestmentGoal, 600);
  assert.equal(summary.availableToInvest, 2640);
  assert.equal(summary.balanceAfterReserve, 2040);
  assert.deepEqual(summary.groupTotals, { carro: 0, casa: 300, fixos: 0, parcelados: 0, diarias: 60 });
  assert.equal(summary.subgoals.diarias.amount, 1200);
  assert.equal(summary.pace.daily, 95);
  assert.equal(summary.pace.weekly, 665);
  assert.equal(domain.cycles[plan.cycleId][0].date, '2027-01-01');
});