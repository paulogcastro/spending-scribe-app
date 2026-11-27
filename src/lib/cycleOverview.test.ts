import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCycleOverview, computeCycleReport, getCyclePace } from './cycleOverview';
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
    group: 'diarias', nature: 'avulso', origin: 'manual', date: '2027-01-01', categoryId: 'category-alimentacao', paymentMethodId: 'payment-credito' };
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

test('computeCycleReport compara com ciclo anterior, filtra por grupo/pagamento e consolida formas de pagamento', () => {
  const domain = createExpenseDomainState();
  const base: ExpenseOccurrence = {
    id: '1', cycleId: '2026-11-04', description: 'Mercado', amount: 240,
    group: 'diarias', nature: 'avulso', origin: 'manual', date: '2026-11-10',
    categoryId: 'category-alimentacao', paymentMethodId: 'payment-credito',
  };
  domain.cycles['2026-11-04'] = [
    base,
    { ...base, id: '2', description: 'Padaria', amount: 60, paymentMethodId: 'payment-pix' },
    { ...base, id: '3', description: 'Aluguel', amount: 1200, group: 'fixos', nature: 'recorrente', categoryId: 'category-moradia', paymentMethodId: 'payment-pix' },
  ];
  domain.cycles['2026-10-04'] = [
    { ...base, id: 'p1', cycleId: '2026-10-04', amount: 200 },
    { ...base, id: 'p2', cycleId: '2026-10-04', group: 'fixos', nature: 'recorrente', amount: 1200, categoryId: 'category-moradia', paymentMethodId: 'payment-pix' },
  ];

  const full = computeCycleReport(domain, '2026-11-04');
  assert.equal(full.total, 1500);
  assert.equal(full.previousTotal, 1400);
  assert.equal(full.deltaAmount, 100);
  assert.equal(full.deltaPercent, 7);
  assert.equal(full.categories[0].categoryId, 'category-moradia');
  assert.equal(full.categories[0].deltaAmount, 0);
  assert.equal(full.categories[1].categoryId, 'category-alimentacao');
  assert.equal(full.categories[1].deltaAmount, 100);
  assert.equal(full.categories[1].deltaPercent, 50);
  assert.equal(full.paymentMethods[0].paymentMethodId, 'payment-pix');
  assert.equal(full.paymentMethods[0].amount, 1260);

  const filtered = computeCycleReport(domain, '2026-11-04', { groupId: 'diarias', paymentMethodId: 'payment-credito' });
  assert.equal(filtered.total, 240);
  assert.equal(filtered.previousTotal, 200);
  assert.equal(filtered.deltaAmount, 40);
  assert.equal(filtered.deltaPercent, 20);
  assert.equal(filtered.categories.length, 1);
});