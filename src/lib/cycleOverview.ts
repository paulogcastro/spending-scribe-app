import type { CyclePlanning } from '../types/finance';
import { getBudgetGroupsMap, type ExpenseDomainState } from './expenseDomain';
import { computePlanning, computeSubgoals, roundMoney } from './cyclePlanning';
import { adjacentCycle, createFinancialCycle, cycleStartDate } from './financialCycles';

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

export interface CategoryBreakdownFilter {
  groupId?: string;
  paymentMethodId?: string;
}

export interface CategoryReportItem {
  categoryId: string;
  name: string;
  amount: number;
  percent: number;
  count: number;
  previousAmount: number;
  deltaAmount: number;
  deltaPercent: number | null;
}

export interface PaymentBreakdownItem {
  paymentMethodId: string;
  name: string;
  amount: number;
  percent: number;
  count: number;
}

export interface CycleReportSummary {
  total: number;
  previousTotal: number;
  deltaAmount: number;
  deltaPercent: number | null;
  count: number;
  categories: CategoryReportItem[];
  paymentMethods: PaymentBreakdownItem[];
}

export function computeCycleReport(
  domain: ExpenseDomainState,
  cycleId: string,
  filter: CategoryBreakdownFilter = {}
): CycleReportSummary {
  const matchesFilter = (item: { group: string; paymentMethodId: string }) => {
    if (filter.groupId && item.group !== filter.groupId) return false;
    if (filter.paymentMethodId && item.paymentMethodId !== filter.paymentMethodId) return false;
    return true;
  };

  const currentItems = (domain.cycles[cycleId] ?? []).filter(matchesFilter);
  const previousCycleId = adjacentCycle(cycleId, -1).id;
  const previousItems = (domain.cycles[previousCycleId] ?? []).filter(matchesFilter);

  const catTotals = new Map<string, { amount: number; count: number }>();
  const payTotals = new Map<string, { amount: number; count: number }>();
  let total = 0;

  for (const item of currentItems) {
    total = roundMoney(total + item.amount);
    const cat = catTotals.get(item.categoryId) ?? { amount: 0, count: 0 };
    catTotals.set(item.categoryId, { amount: roundMoney(cat.amount + item.amount), count: cat.count + 1 });

    const pay = payTotals.get(item.paymentMethodId) ?? { amount: 0, count: 0 };
    payTotals.set(item.paymentMethodId, { amount: roundMoney(pay.amount + item.amount), count: pay.count + 1 });
  }

  const prevCatTotals = new Map<string, number>();
  let previousTotal = 0;
  for (const item of previousItems) {
    previousTotal = roundMoney(previousTotal + item.amount);
    prevCatTotals.set(item.categoryId, roundMoney((prevCatTotals.get(item.categoryId) ?? 0) + item.amount));
  }

  const categories: CategoryReportItem[] = Array.from(catTotals.entries())
    .map(([categoryId, stats]) => {
      const previousAmount = prevCatTotals.get(categoryId) ?? 0;
      const deltaAmount = roundMoney(stats.amount - previousAmount);
      const deltaPercent = previousAmount > 0 ? Math.round((deltaAmount / previousAmount) * 100) : null;
      return {
        categoryId,
        name: domain.categories[categoryId]?.name ?? 'Sem categoria',
        amount: stats.amount,
        percent: total > 0 ? Math.round((stats.amount / total) * 100) : 0,
        count: stats.count,
        previousAmount,
        deltaAmount,
        deltaPercent,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const paymentMethods: PaymentBreakdownItem[] = Array.from(payTotals.entries())
    .map(([paymentMethodId, stats]) => ({
      paymentMethodId,
      name: domain.paymentMethods[paymentMethodId]?.name ?? 'Sem forma de pagamento',
      amount: stats.amount,
      percent: total > 0 ? Math.round((stats.amount / total) * 100) : 0,
      count: stats.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  const deltaAmount = roundMoney(total - previousTotal);
  const deltaPercent = previousTotal > 0 ? Math.round((deltaAmount / previousTotal) * 100) : null;

  return {
    total,
    previousTotal,
    deltaAmount,
    deltaPercent,
    count: currentItems.length,
    categories,
    paymentMethods,
  };
}

export function computeCycleOverview(plan: CyclePlanning, domain: ExpenseDomainState, today = new Date()) {
  const planning = computePlanning(plan);
  const groupsMap = getBudgetGroupsMap(domain);
  const groupIds = Array.from(new Set([...Object.keys(groupsMap), 'carro', 'casa', 'fixos', 'parcelados', 'diarias']));
  const subgoals = computeSubgoals(plan, groupIds);
  const groupTotals: Record<string, number> = Object.fromEntries(groupIds.map(id => [id, 0]));
  // Membership comes from the cycle key; expense dates do not reassign occurrences.
  for (const item of domain.cycles[plan.cycleId] ?? []) {
    groupTotals[item.group] = (groupTotals[item.group] ?? 0) + item.amount;
  }
  for (const group of Object.keys(groupTotals)) groupTotals[group] = roundMoney(groupTotals[group]);
  const expenses = roundMoney(Object.values(groupTotals).reduce((sum, value) => sum + value, 0));
  const effectiveSalary = plan.receivedSalary > 0 ? plan.receivedSalary : plan.plannedSalary;
  const income = roundMoney(effectiveSalary + planning.extraIncomeTotal);
  return {
    ...planning, subgoals, income, expenses, groupTotals,
    availableToInvest: roundMoney(income - expenses),
    expenseRemaining: roundMoney(planning.mainExpenseGoal - expenses),
    // This is a planned reserve, not an investment realization (not tracked by cycle yet).
    balanceAfterReserve: roundMoney(income - expenses - planning.totalInvestmentGoal),
    pace: getCyclePace(plan.cycleId, subgoals.diarias.amount, groupTotals.diarias, today),
  };
}