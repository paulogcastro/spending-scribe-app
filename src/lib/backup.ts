import { z } from 'zod';
import type { CyclePlanningState, FinancialCycleState, MonthlyData } from '@/types/finance';
import { CYCLE_STORAGE_KEY, parseCycleState } from './financialCycles';
import { PLANNING_STORAGE_KEY, parsePlanningState } from './cyclePlanning';

const money = z.number().finite().nonnegative();
const item = z.object({ id: z.string().min(1), description: z.string(), note: z.string().optional() });
const categories = z.enum(['casa', 'carro', 'alimentacao', 'almoco', 'besteira', 'lazer', 'hobbies', 'saude', 'roupa', 'tiriri', 'estudos', 'investimento', 'outros']);
const dailyCategories = z.enum(['alimentacao', 'almoco', 'besteira', 'lazer', 'hobbies', 'saude', 'carro', 'roupa', 'tiriri', 'estudos', 'outros']);
const fixed = item.extend({ actual: money, installments: z.string().optional() });
const goals = z.object({ casa: money, carro: money, parcelados: money, diarias: money });
const month = z.object({
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  income: z.array(item.extend({ planned: money, actual: money })),
  casa: z.array(fixed), carro: z.array(fixed),
  parcelados: z.array(fixed.extend({ card: z.enum(['cartao_mae', 'cartao_inter', 'mercado_pago', 'pix']), category: categories.optional(), isRecurring: z.boolean().optional() })),
  diarias: z.array(item.extend({ amount: money, category: dailyCategories, source: z.enum(['inter_credito', 'pix', 'neon', 'mercado_pago']), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), createdAt: z.string(), importKey: z.string().optional() })),
  investments: z.array(item.extend({ amount: money })).default([]),
  investmentGoal: money.default(0),
  expenseGoals: goals.default({ casa: 0, carro: 0, parcelados: 0, diarias: 0 }),
});
const schema = z.object({
  version: z.union([z.literal(1), z.literal(2)]), exportedAt: z.string(), months: z.record(month),
  merchantCategories: z.record(dailyCategories).default({}),
  cycleState: z.unknown().optional(), cyclePlanning: z.unknown().optional(),
});
export type FinanceBackup = {
  version: 1 | 2; exportedAt: string; months: Record<string, MonthlyData>;
  merchantCategories: Record<string, z.infer<typeof dailyCategories>>;
  cycleState?: FinancialCycleState; cyclePlanning?: CyclePlanningState;
};
export const MONTHS_STORAGE_KEY = 'finance-tracker-data';
export const MERCHANT_STORAGE_KEY = 'finance-import-categories';

export function parseBackup(text: string): FinanceBackup {
  const parsed = schema.parse(JSON.parse(text));
  for (const [key, value] of Object.entries(parsed.months)) {
    if (key !== value.yearMonth) throw new Error('Mês inválido no backup.');
    for (const group of [value.income, value.casa, value.carro, value.parcelados, value.diarias, value.investments]) {
      if (new Set(group.map(entry => entry.id)).size !== group.length) throw new Error('Identificadores repetidos no backup.');
    }
  }
  const result: FinanceBackup = { version: parsed.version, exportedAt: parsed.exportedAt, months: parsed.months as Record<string, MonthlyData>, merchantCategories: parsed.merchantCategories };
  if (parsed.version === 2) {
    // Backups v2 precisam trazer ciclos e planejamento completos e válidos.
    if (parsed.cycleState === undefined || parsed.cyclePlanning === undefined) throw new Error('Backup incompleto.');
    result.cycleState = parseCycleState(JSON.stringify(parsed.cycleState));
    result.cyclePlanning = parsePlanningState(JSON.stringify(parsed.cyclePlanning));
  }
  return result;
}

/** Backup antigo (v1): contém apenas meses e categorias, sem ciclos/planejamento. */
export function isLegacyBackup(backup: FinanceBackup): boolean {
  return backup.cycleState === undefined || backup.cyclePlanning === undefined;
}

type BackupStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Monta e valida o backup completo (todos os meses, categorias, ciclos e planejamentos). */
export function buildBackup(storage: BackupStorage, months: Record<string, MonthlyData>, now = new Date()): FinanceBackup {
  const read = (key: string, fallback: string) => storage.getItem(key) ?? fallback;
  const cycleText = storage.getItem(CYCLE_STORAGE_KEY);
  const payload = {
    version: 2, exportedAt: now.toISOString(), months,
    merchantCategories: JSON.parse(read(MERCHANT_STORAGE_KEY, '{}')),
    cycleState: cycleText === null ? undefined : JSON.parse(cycleText),
    cyclePlanning: JSON.parse(read(PLANNING_STORAGE_KEY, '{"version":1,"plans":{}}')),
  };
  if (payload.cycleState === undefined) throw new Error('Estado dos ciclos indisponível.');
  return parseBackup(JSON.stringify(payload));
}

/**
 * Restaura de forma atômica: valida tudo antes, grava, e em qualquer falha
 * devolve todas as chaves ao estado anterior. Backups antigos preservam ciclos e planejamento atuais.
 */
export function applyBackup(storage: BackupStorage, backup: FinanceBackup): { legacy: boolean } {
  const validated = parseBackup(JSON.stringify(backup));
  const legacy = isLegacyBackup(validated);
  const writes: [string, string][] = [
    [MONTHS_STORAGE_KEY, JSON.stringify(validated.months)],
    [MERCHANT_STORAGE_KEY, JSON.stringify(validated.merchantCategories)],
  ];
  if (!legacy) {
    writes.push([CYCLE_STORAGE_KEY, JSON.stringify(validated.cycleState)]);
    writes.push([PLANNING_STORAGE_KEY, JSON.stringify(validated.cyclePlanning)]);
  }
  const snapshot = writes.map(([key]) => [key, storage.getItem(key)] as const);
  try {
    for (const [key, value] of writes) storage.setItem(key, value);
  } catch (error) {
    for (const [key, value] of snapshot) { if (value === null) storage.removeItem(key); else storage.setItem(key, value); }
    throw error;
  }
  return { legacy };
}
