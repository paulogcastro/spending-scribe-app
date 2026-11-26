import { supabase } from '@/lib/supabase';
import { CYCLE_STORAGE_KEY, parseCycleState } from '@/lib/financialCycles';
import { PLANNING_STORAGE_KEY, parsePlanningState } from '@/lib/cyclePlanning';
import { EXPENSE_DOMAIN_STORAGE_KEY, parseExpenseDomainState, type ExpenseDomainState } from '@/lib/expenseDomain';
import type { CyclePlanningState, FinancialCycleState } from '@/types/finance';

export interface CloudFinanceSnapshot {
  cycleState: FinancialCycleState | null;
  cyclePlanning: CyclePlanningState | null;
  expenseDomain: ExpenseDomainState | null;
  updatedAt?: string;
}

export function readLocalFinanceSnapshot(): CloudFinanceSnapshot {
  const rawCycle = localStorage.getItem(CYCLE_STORAGE_KEY);
  const rawPlanning = localStorage.getItem(PLANNING_STORAGE_KEY);
  const rawDomain = localStorage.getItem(EXPENSE_DOMAIN_STORAGE_KEY);

  return {
    cycleState: rawCycle ? parseCycleState(rawCycle) : null,
    cyclePlanning: rawPlanning ? parsePlanningState(rawPlanning) : null,
    expenseDomain: rawDomain ? parseExpenseDomainState(rawDomain) : null,
  };
}

export function hasMeaningfulLocalData(snapshot: CloudFinanceSnapshot): boolean {
  const hasPlans = Object.keys(snapshot.cyclePlanning?.plans ?? {}).length > 0;
  const hasCycles = Object.keys(snapshot.expenseDomain?.cycles ?? {}).length > 0;
  const hasRecurring = Object.keys(snapshot.expenseDomain?.recurringDefinitions ?? {}).length > 0;
  const hasInstallments = Object.keys(snapshot.expenseDomain?.installmentDefinitions ?? {}).length > 0;
  return hasPlans || hasCycles || hasRecurring || hasInstallments;
}

export function applyCloudSnapshotToLocalStorage(snapshot: CloudFinanceSnapshot): void {
  if (snapshot.cycleState) {
    const valid = parseCycleState(JSON.stringify(snapshot.cycleState));
    localStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(valid));
  }
  if (snapshot.cyclePlanning) {
    const valid = parsePlanningState(JSON.stringify(snapshot.cyclePlanning));
    localStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(valid));
  }
  if (snapshot.expenseDomain) {
    const valid = parseExpenseDomainState(JSON.stringify(snapshot.expenseDomain));
    localStorage.setItem(EXPENSE_DOMAIN_STORAGE_KEY, JSON.stringify(valid));
  }
}

export async function fetchCloudFinanceData(userId: string): Promise<CloudFinanceSnapshot | null> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase
    .from('user_finance_data')
    .select('cycle_state, cycle_planning, expense_domain, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    cycleState: data.cycle_state ? parseCycleState(JSON.stringify(data.cycle_state)) : null,
    cyclePlanning: data.cycle_planning ? parsePlanningState(JSON.stringify(data.cycle_planning)) : null,
    expenseDomain: data.expense_domain ? parseExpenseDomainState(JSON.stringify(data.expense_domain)) : null,
    updatedAt: data.updated_at ?? undefined,
  };
}

export async function saveCloudFinanceData(userId: string, snapshot: CloudFinanceSnapshot): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const payload = {
    user_id: userId,
    cycle_state: snapshot.cycleState ? parseCycleState(JSON.stringify(snapshot.cycleState)) : null,
    cycle_planning: snapshot.cyclePlanning ? parsePlanningState(JSON.stringify(snapshot.cyclePlanning)) : null,
    expense_domain: snapshot.expenseDomain ? parseExpenseDomainState(JSON.stringify(snapshot.expenseDomain)) : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('user_finance_data').upsert(payload, { onConflict: 'user_id' });
  if (error) throw error;
}
