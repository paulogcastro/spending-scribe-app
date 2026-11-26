import type { CyclePlanning } from '../types/finance';
import type { ExpenseDomainState } from './expenseDomain';
import { computePlanning, roundMoney } from './cyclePlanning';
import { createFinancialCycle, cycleStartDate } from './financialCycles';

// UTC is used only to number civil days, not to interpret stored dates as instants.
function civilDay(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}

export function getCyclePace(cycleId: string, goal: number, spent: number, today = new Date()) {
  if (!Number.isFinite(today.getTime())) throw new Error('Data inválida.');
  const cycle = createFinancialCycle(cycleId);
  const start = civilDay(cycleStartDate(cycle.startDate));
  const end = civilDay(cycleStartDate(cycle.endDate));
  const current = civilDay(today);
  const totalDays = Math.max(1, end - start);
  const daysRemaining = Math.max(0, end - Math.max(start, current));
  const daysElapsed = Math.min(totalDays, Math.max(0, totalDays - daysRemaining));
  const remaining = roundMoney(goal - spent);
  const daily = goal > 0 && daysRemaining > 0 ? Math.max(0, remaining) / daysRemaining : 0;
  return {
    totalDays, daysElapsed, daysRemaining, remaining, daily: roundMoney(daily),
    weekly: roundMoney(daily * Math.min(7, daysRemaining)),
    hasGoal: goal > 0,
    status: current < start ? 'future' as const : current >= end ? 'closed' as const : 'current' as const,
  };
}

export interface CategoryBreakdownItem {
  categoryId: string;
  name: string;
  amount: number;
  percent: number;
}

export function computeCategoryBreakdown(domain: ExpenseDomainState, cycleId: string): CategoryBreakdownItem[] {
  const totals = new Map<string, number>();
  let grandTotal = 0;
  for (const item of domain.cycles[cycleId] ?? []) {
    totals.set(item.categoryId, roundMoney((totals.get(item.categoryId) ?? 0) + item.amount));
    grandTotal = roundMoney(grandTotal + item.amount);
  }
  return Array.from(totals.entries())
    .map(([categoryId, amount]) => ({
      categoryId,
      name: domain.categories[categoryId]?.name ?? 'Sem categoria',
      amount,
      percent: grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function computeCycleOverview(plan: CyclePlanning, domain: ExpenseDomainState, today = new Date()) {
  const planning = computePlanning(plan);
  const groupTotals = { carro: 0, casa: 0, fixos: 0, parcelados: 0, diarias: 0 };
  // Membership comes from the cycle key; expense dates do not reassign occurrences.
  for (const item of domain.cycles[plan.cycleId] ?? []) groupTotals[item.group] += item.amount;
  for (const group of Object.keys(groupTotals) as (keyof typeof groupTotals)[]) groupTotals[group] = roundMoney(groupTotals[group]);
  const expenses = roundMoney(Object.values(groupTotals).reduce((sum, value) => sum + value, 0));
  const income = roundMoney(plan.receivedSalary + planning.extraIncomeTotal);
  return {
    ...planning, income, expenses, groupTotals,
    expenseRemaining: roundMoney(planning.mainExpenseGoal - expenses),
    // This is a planned reserve, not an investment realization (not tracked by cycle yet).
    balanceAfterReserve: roundMoney(income - expenses - planning.totalInvestmentGoal),
    pace: getCyclePace(plan.cycleId, planning.subgoals.diarias.amount, groupTotals.diarias, today),
  };
}