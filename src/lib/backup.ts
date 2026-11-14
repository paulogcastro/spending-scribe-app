import { z } from 'zod';
import type { MonthlyData } from '@/types/finance';

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
const schema = z.object({ version: z.literal(1), exportedAt: z.string(), months: z.record(month), merchantCategories: z.record(dailyCategories).default({}) });
export type FinanceBackup = { version: 1; exportedAt: string; months: Record<string, MonthlyData>; merchantCategories: Record<string, z.infer<typeof dailyCategories>> };
export function parseBackup(text: string): FinanceBackup {
  const parsed = schema.parse(JSON.parse(text));
  for (const [key, value] of Object.entries(parsed.months)) {
    if (key !== value.yearMonth) throw new Error('Mês inválido no backup.');
    for (const group of [value.income, value.casa, value.carro, value.parcelados, value.diarias, value.investments]) {
      if (new Set(group.map(entry => entry.id)).size !== group.length) throw new Error('Identificadores repetidos no backup.');
    }
  }
  return parsed as FinanceBackup;
}