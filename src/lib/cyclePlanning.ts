import type { BudgetGroup, CyclePlanning, CyclePlanningState, ExtraIncome } from '../types/finance';
import { adjacentCycle, createFinancialCycle } from './financialCycles';

export const PLANNING_STORAGE_KEY = 'spending-scribe-cycle-planning-v1';
export const BUDGET_GROUPS: BudgetGroup[] = ['carro', 'casa', 'fixos', 'parcelados'];

export const budgetGroupLabels: Record<BudgetGroup | 'diarias', string> = {
  carro: 'Carro',
  casa: 'Casa',
  fixos: 'Gastos fixos',
  parcelados: 'Gastos parcelados',
  diarias: 'Gastos diários',
};

const EPSILON = 1e-9;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertMoney(value: number, message: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(message);
}

export function createEmptyPlanning(cycleId: string): CyclePlanning {
  createFinancialCycle(cycleId); // valida o identificador do ciclo
  return {
    cycleId,
    plannedSalary: 0,
    receivedSalary: 0,
    extraIncomes: [],
    investmentBaseGoal: 0,
    distribution: { carro: 0, casa: 0, fixos: 0, parcelados: 0 },
  };
}

// === Cálculos centralizados (única fonte das fórmulas financeiras) ===

export function extraIncomeTotal(plan: CyclePlanning): number {
  return roundMoney(plan.extraIncomes.reduce((sum, item) => sum + item.amount, 0));
}

// Rendas extras não alteram a meta de investimento; aumentam o caixa livre do ciclo.
export function investmentIncrement(_plan: CyclePlanning): number {
  return 0;
}

export function totalInvestmentGoal(plan: CyclePlanning): number {
  return roundMoney(plan.investmentBaseGoal);
}

// Meta principal de despesas: exclusivamente salário planejado menos meta de investimento.
export function mainExpenseGoal(plan: CyclePlanning): number {
  return roundMoney(plan.plannedSalary - plan.investmentBaseGoal);
}

function allEditableGroups(plan: CyclePlanning, extraGroups: string[] = []): string[] {
  const keys = new Set<string>([...BUDGET_GROUPS, ...Object.keys(plan.distribution), ...extraGroups]);
  keys.delete('diarias');
  return Array.from(keys);
}

export function dailyResidualPercent(plan: CyclePlanning, extraGroups: string[] = []): number {
  const used = allEditableGroups(plan, extraGroups).reduce((sum, group) => sum + (plan.distribution[group] ?? 0), 0);
  return roundMoney(100 - used);
}

export interface Subgoal { percent: number; amount: number }

// Gastos diários é o residual em reais após os outros grupos,
// garantindo que a soma das submetas feche exatamente com a meta principal.
export function computeSubgoals(plan: CyclePlanning, extraGroups: string[] = []): Record<string, Subgoal> {
  const main = mainExpenseGoal(plan);
  const subgoals: Record<string, Subgoal> = {};
  let allocated = 0;
  const groups = allEditableGroups(plan, extraGroups);
  for (const group of groups) {
    const pct = plan.distribution[group] ?? 0;
    const amount = roundMoney(main * pct / 100);
    subgoals[group] = { percent: pct, amount };
    allocated = roundMoney(allocated + amount);
  }
  subgoals.diarias = { percent: dailyResidualPercent(plan, extraGroups), amount: roundMoney(main - allocated) };
  return subgoals;
}

export function computePlanning(plan: CyclePlanning) {
  const goal = totalInvestmentGoal(plan);
  const invested = roundMoney(plan.investedAmount ?? 0);
  const investmentDiff = roundMoney(invested - goal);
  const investmentAchievementPercent = goal > 0 ? Math.round((invested / goal) * 100) : 0;
  return {
    extraIncomeTotal: extraIncomeTotal(plan),
    investmentIncrement: investmentIncrement(plan),
    totalInvestmentGoal: goal,
    investedAmount: invested,
    investmentDiff,
    investmentAchievementPercent,
    mainExpenseGoal: mainExpenseGoal(plan),
    subgoals: computeSubgoals(plan),
  };
}

// === Mutações puras com validação (lançam erro em regra violada) ===

export function setPlannedSalary(plan: CyclePlanning, value: number): CyclePlanning {
  assertMoney(value, 'O salário planejado não pode ser negativo.');
  if (value < plan.investmentBaseGoal) throw new Error('O salário planejado não pode ser menor que a meta-base de investimento.');
  return { ...plan, plannedSalary: roundMoney(value) };
}

export function setReceivedSalary(plan: CyclePlanning, value: number): CyclePlanning {
  assertMoney(value, 'O salário recebido não pode ser negativo.');
  return { ...plan, receivedSalary: roundMoney(value) };
}

export function setInvestmentBaseGoal(plan: CyclePlanning, value: number): CyclePlanning {
  assertMoney(value, 'A meta de investimento não pode ser negativa.');
  if (value > plan.plannedSalary) throw new Error('A meta de investimento não pode ser maior que o salário planejado.');
  return { ...plan, investmentBaseGoal: roundMoney(value) };
}

export function setInvestedAmount(plan: CyclePlanning, value: number): CyclePlanning {
  assertMoney(value, 'O valor investido não pode ser negativo.');
  return { ...plan, investedAmount: roundMoney(value) };
}

export function setDistributionPercent(plan: CyclePlanning, group: BudgetGroup, value: number): CyclePlanning {
  if (group === 'diarias') throw new Error('Gastos diários é calculado automaticamente como residual.');
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('O percentual deve estar entre 0% e 100%.');
  const others = allEditableGroups(plan)
    .filter(g => g !== group)
    .reduce((sum, g) => sum + (plan.distribution[g] ?? 0), 0);
  if (others + value > 100 + EPSILON) throw new Error('A soma dos percentuais não pode ultrapassar 100%.');
  return { ...plan, distribution: { ...plan.distribution, [group]: roundMoney(value) } };
}

export function setDistributionAmount(plan: CyclePlanning, group: BudgetGroup, amount: number): CyclePlanning {
  assertMoney(amount, 'O valor da submeta não pode ser negativo.');
  const main = mainExpenseGoal(plan);
  if (main <= 0) {
    if (amount === 0) return setDistributionPercent(plan, group, 0);
    throw new Error('Defina o salário planejado e o limite de despesas antes de distribuir valores.');
  }
  const percent = roundMoney((amount / main) * 100);
  return setDistributionPercent(plan, group, percent);
}

export function addExtraIncome(plan: CyclePlanning, item: { description: string; amount: number }): CyclePlanning {
  const description = item.description.trim();
  if (!description) throw new Error('A renda extra precisa de uma descrição.');
  assertMoney(item.amount, 'O valor da renda extra não pode ser negativo.');
  const entry: ExtraIncome = { id: crypto.randomUUID(), description, amount: roundMoney(item.amount) };
  return { ...plan, extraIncomes: [...plan.extraIncomes, entry] };
}

export function updateExtraIncome(plan: CyclePlanning, id: string, updates: Partial<Omit<ExtraIncome, 'id'>>): CyclePlanning {
  if (updates.amount !== undefined) assertMoney(updates.amount, 'O valor da renda extra não pode ser negativo.');
  if (updates.description !== undefined && !updates.description.trim()) throw new Error('A renda extra precisa de uma descrição.');
  return {
    ...plan,
    extraIncomes: plan.extraIncomes.map(item => item.id === id
      ? { ...item, ...(updates.description !== undefined ? { description: updates.description.trim() } : {}), ...(updates.amount !== undefined ? { amount: roundMoney(updates.amount) } : {}) }
      : item),
  };
}

export function removeExtraIncome(plan: CyclePlanning, id: string): CyclePlanning {
  return { ...plan, extraIncomes: plan.extraIncomes.filter(item => item.id !== id) };
}

// === Inicialização e cópia entre ciclos ===

// Cópia permitida: salário planejado, meta-base e percentuais.
// Nunca copia: salário recebido, rendas extras ou qualquer realização.
export function copyConfigFrom(previous: CyclePlanning, cycleId: string): CyclePlanning {
  return {
    ...createEmptyPlanning(cycleId),
    plannedSalary: previous.plannedSalary,
    investmentBaseGoal: previous.investmentBaseGoal,
    distribution: { ...previous.distribution },
  };
}

// Retorna o planejamento próprio do ciclo; se não existir, inicializa a partir
// do ciclo imediatamente anterior (sem nunca sobrescrever dados próprios).
export function getCyclePlanning(state: CyclePlanningState, cycleId: string): CyclePlanning {
  const own = state.plans[cycleId];
  if (own) return own;
  const previous = state.plans[adjacentCycle(cycleId, -1).id];
  return previous ? copyConfigFrom(previous, cycleId) : createEmptyPlanning(cycleId);
}

export function upsertPlanning(state: CyclePlanningState, plan: CyclePlanning): CyclePlanningState {
  return { version: 1, plans: { ...state.plans, [plan.cycleId]: plan } };
}

// === Persistência versionada e validada ===

function parsePlan(cycleId: string, value: unknown): CyclePlanning {
  createFinancialCycle(cycleId); // identificador precisa ser um ciclo válido
  const plan = value as Partial<CyclePlanning> | null;
  if (!plan || plan.cycleId !== cycleId) throw new Error('Planejamento de ciclo inválido.');
  const money = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  if (!money(plan.plannedSalary) || !money(plan.receivedSalary) || !money(plan.investmentBaseGoal)) throw new Error('Valores de planejamento inválidos.');
  if (plan.investedAmount !== undefined && !money(plan.investedAmount)) throw new Error('Valor investido inválido.');
  if ((plan.investmentBaseGoal as number) > (plan.plannedSalary as number)) throw new Error('Meta-base maior que o salário planejado.');
  if (!Array.isArray(plan.extraIncomes)) throw new Error('Rendas extras inválidas.');
  const extraIncomes: ExtraIncome[] = plan.extraIncomes.map(item => {
    const entry = item as Partial<ExtraIncome> | null;
    if (!entry || typeof entry.id !== 'string' || typeof entry.description !== 'string' || !money(entry.amount)) throw new Error('Renda extra inválida.');
    return { id: entry.id, description: entry.description, amount: entry.amount as number };
  });
  const dist = plan.distribution as Partial<Record<string, number>> | null;
  if (!dist || typeof dist !== 'object' || Array.isArray(dist)) throw new Error('Distribuição de percentuais inválida.');
  const distribution: Record<string, number> = {};
  let total = 0;
  for (const group of BUDGET_GROUPS) {
    const percent = dist[group];
    if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error('Percentual inválido.');
    distribution[group] = percent;
    total += percent;
  }
  for (const [group, percent] of Object.entries(dist)) {
    if (BUDGET_GROUPS.includes(group) || group === 'diarias' || ['__proto__', 'constructor', 'prototype'].includes(group)) continue;
    if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error('Percentual inválido.');
    distribution[group] = percent;
    total += percent;
  }
  if (total > 100 + EPSILON) throw new Error('A soma dos percentuais ultrapassa 100%.');
  return {
    cycleId,
    plannedSalary: plan.plannedSalary as number,
    receivedSalary: plan.receivedSalary as number,
    extraIncomes,
    investmentBaseGoal: plan.investmentBaseGoal as number,
    ...(plan.investedAmount !== undefined ? { investedAmount: plan.investedAmount as number } : {}),
    distribution,
  };
}

export function parsePlanningState(text: string): CyclePlanningState {
  const value = JSON.parse(text);
  if (!value || value.version !== 1 || !value.plans || typeof value.plans !== 'object' || Array.isArray(value.plans)) {
    throw new Error('Armazenamento de planejamento inválido.');
  }
  const plans: Record<string, CyclePlanning> = {};
  for (const [cycleId, entry] of Object.entries(value.plans)) {
    plans[cycleId] = parsePlan(cycleId, entry);
  }
  return { version: 1, plans };
}

type PlanningStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function loadPlanningState(storage: PlanningStorage): CyclePlanningState {
  const stored = storage.getItem(PLANNING_STORAGE_KEY);
  if (stored !== null) return parsePlanningState(stored);
  return { version: 1, plans: {} };
}

export function savePlanningState(storage: PlanningStorage, state: CyclePlanningState): void {
  const validated = parsePlanningState(JSON.stringify(state));
  storage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(validated));
}
