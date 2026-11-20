import { z } from 'zod';
import { createFinancialCycle } from './financialCycles';
import { expenseCategoryLabels } from '../types/finance';

export const EXPENSE_DOMAIN_STORAGE_KEY = 'spending-scribe-expense-domain-v1';
const id = z.string().min(1).refine(value => value.trim() === value && !['__proto__', 'constructor', 'prototype'].includes(value));
const money = z.number().finite().nonnegative();
const group = z.enum(['carro', 'casa', 'fixos', 'parcelados', 'diarias']);
export function isExpenseNatureCompatible(group: string, nature: string): boolean {
  return (group === 'carro' || group === 'casa') ? ['avulso', 'recorrente', 'parcelado'].includes(nature)
    : group === 'fixos' ? nature === 'recorrente' : group === 'parcelados' ? nature === 'parcelado' : group === 'diarias' && nature === 'avulso';
}
const cycleId = id.refine(value => { try { createFinancialCycle(value); return true; } catch { return false; } });
const date = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/).refine(value => {
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day >= 1 && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
});
export const expenseCategorySchema = z.object({ id, name: z.string().trim().min(1), active: z.boolean() }).strict();
export const paymentMethodSchema = expenseCategorySchema.extend({ type: z.enum(['cartao_credito', 'pix', 'dinheiro', 'outros']) }).strict();
const common = { id, description: z.string().trim().min(1), amount: money, group, categoryId: id, paymentMethodId: id, note: z.string().optional() };
const installment = z.object({ number: z.number().int().positive(), total: z.number().int().positive() }).strict().refine(value => value.number <= value.total);
export const expenseOccurrenceSchema = z.object({
  ...common, cycleId, nature: z.enum(['avulso', 'recorrente', 'parcelado']), date,
  origin: z.enum(['manual', 'importacao', 'notificacao']), definitionId: id.optional(), installment: installment.optional(),
}).strict().superRefine((value, ctx) => {
  if ((value.nature === 'parcelado') !== (value.installment !== undefined)) ctx.addIssue({ code: 'custom', message: 'Dados de parcela incompatíveis com a natureza.' });
  if (value.nature === 'avulso' && value.definitionId !== undefined) ctx.addIssue({ code: 'custom', message: 'Despesa avulsa não possui definição permanente.' });
  if (value.nature !== 'avulso' && value.definitionId === undefined) ctx.addIssue({ code: 'custom', message: 'Recorrências e parcelas exigem uma definição permanente.' });
  if (!isExpenseNatureCompatible(value.group, value.nature)) ctx.addIssue({ code: 'custom', message: 'Grupo incompatível com a natureza da despesa.' });
});
export const recurringDefinitionSchema = z.object({ ...common, active: z.boolean(), startDate: date, endDate: date.optional(), dayOfMonth: z.number().int().min(1).max(31) }).strict().refine(value => !value.endDate || value.endDate >= value.startDate).refine(value => isExpenseNatureCompatible(value.group, 'recorrente'));
export const installmentDefinitionSchema = z.object({ ...common, active: z.boolean(), startDate: date, totalInstallments: z.number().int().positive() }).strict().refine(value => isExpenseNatureCompatible(value.group, 'parcelado'));
const stateSchema = z.object({
  version: z.literal(1), cycles: z.record(z.array(expenseOccurrenceSchema)),
  categories: z.record(expenseCategorySchema), paymentMethods: z.record(paymentMethodSchema),
  recurringDefinitions: z.record(recurringDefinitionSchema), installmentDefinitions: z.record(installmentDefinitionSchema),
}).strict();

export type ExpenseOccurrence = z.infer<typeof expenseOccurrenceSchema>;
export type ExpenseCategoryRecord = z.infer<typeof expenseCategorySchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type RecurringDefinition = z.infer<typeof recurringDefinitionSchema>;
export type InstallmentDefinition = z.infer<typeof installmentDefinitionSchema>;
export type ExpenseDomainState = z.infer<typeof stateSchema>;

// Seeds are independent catalog records, not a migration of monthly transactions.
export function createExpenseDomainState(): ExpenseDomainState {
  const categories = Object.fromEntries(Object.entries(expenseCategoryLabels).filter(([key]) => key !== 'investimento').map(([key, name]) => {
    const id = `category-${key}`;
    return [id, { id, name, active: true }];
  }));
  const paymentMethods: PaymentMethod[] = [
    { id: 'payment-inter', name: 'Cartão Inter', type: 'cartao_credito', active: true },
    { id: 'payment-mercado-pago', name: 'Cartão Mercado Pago', type: 'cartao_credito', active: true },
    { id: 'payment-mae', name: 'Cartão da mãe', type: 'cartao_credito', active: true },
    { id: 'payment-pix', name: 'Pix', type: 'pix', active: true },
    { id: 'payment-dinheiro', name: 'Dinheiro', type: 'dinheiro', active: true },
    { id: 'payment-outros', name: 'Outros', type: 'outros', active: true },
  ];
  return { version: 1, cycles: {}, categories, paymentMethods: Object.fromEntries(paymentMethods.map(value => [value.id, value])), recurringDefinitions: {}, installmentDefinitions: {} };
}

export function parseExpenseDomainState(text: string): ExpenseDomainState {
  const state = stateSchema.parse(JSON.parse(text));
  const definitions = [...Object.values(state.recurringDefinitions), ...Object.values(state.installmentDefinitions)];
  const definitionIds = definitions.map(value => value.id);
  if (new Set(definitionIds).size !== definitionIds.length) throw new Error('IDs de definições repetidos.');
  for (const records of [state.categories, state.paymentMethods, state.recurringDefinitions, state.installmentDefinitions]) {
    for (const [key, value] of Object.entries(records)) if (id.safeParse(key).success === false || key !== value.id) throw new Error('ID de registro inválido.');
  }
  const occurrenceIds = new Set<string>();
  const references = (value: Pick<ExpenseOccurrence, 'categoryId' | 'paymentMethodId'>) => {
    if (!Object.prototype.hasOwnProperty.call(state.categories, value.categoryId) || !Object.prototype.hasOwnProperty.call(state.paymentMethods, value.paymentMethodId)) throw new Error('Categoria ou forma de pagamento inexistente.');
  };
  definitions.forEach(references);
  for (const [key, occurrences] of Object.entries(state.cycles)) {
    createFinancialCycle(key);
    for (const occurrence of occurrences) {
      if (key !== occurrence.cycleId || occurrenceIds.has(occurrence.id)) throw new Error('Ciclo ou ID de ocorrência inválido.');
      occurrenceIds.add(occurrence.id);
      references(occurrence);
      if (occurrence.definitionId !== undefined) {
        const definition = occurrence.nature === 'recorrente' ? state.recurringDefinitions[occurrence.definitionId] : state.installmentDefinitions[occurrence.definitionId];
        if (!definition || definition.group !== occurrence.group) throw new Error('Definição incompatível com a ocorrência.');
        if ('totalInstallments' in definition && occurrence.installment?.total !== definition.totalInstallments) throw new Error('Total de parcelas incompatível com a definição.');
      }
    }
  }
  return state;
}

type DomainStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function loadExpenseDomainState(storage: DomainStorage): ExpenseDomainState {
  const stored = storage.getItem(EXPENSE_DOMAIN_STORAGE_KEY);
  const state = stored === null ? createExpenseDomainState() : parseExpenseDomainState(stored);
  const investment = state.categories['category-investimento'];
  if (investment) {
    const used = [...Object.values(state.cycles).flat(), ...Object.values(state.recurringDefinitions), ...Object.values(state.installmentDefinitions)].some(value => value.categoryId === investment.id);
    if (used) state.categories[investment.id] = { ...investment, active: false };
    else delete state.categories[investment.id];
  }
  return state;
}

export function saveExpenseDomainState(storage: DomainStorage, state: ExpenseDomainState): void {
  const validated = parseExpenseDomainState(JSON.stringify(state));
  const previous = loadExpenseDomainState(storage); // Invalid stored data must never be silently overwritten.
  const historical = [...Object.values(previous.cycles).flat(), ...Object.values(previous.recurringDefinitions), ...Object.values(previous.installmentDefinitions)];
  for (const value of historical) {
    if (!Object.prototype.hasOwnProperty.call(validated.categories, value.categoryId) || !Object.prototype.hasOwnProperty.call(validated.paymentMethods, value.paymentMethodId)) throw new Error('Desative os registros utilizados no histórico, sem excluí-los.');
  }
  storage.setItem(EXPENSE_DOMAIN_STORAGE_KEY, JSON.stringify(validated));
}

export function deactivateExpenseCatalogRecord(state: ExpenseDomainState, catalog: 'categories' | 'paymentMethods', recordId: string): ExpenseDomainState {
  const record = state[catalog][recordId];
  if (!record) throw new Error('Registro não encontrado.');
  return parseExpenseDomainState(JSON.stringify({ ...state, [catalog]: { ...state[catalog], [recordId]: { ...record, active: false } } }));
}

export type ManualExpenseGroup = 'carro' | 'casa' | 'diarias';
export interface ManualExpenseInput { description: string; amount: number; categoryId: string; paymentMethodId: string; date: string; note?: string }
export function localExpenseDate(today = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}
function validateManualInput(state: ExpenseDomainState, input: ManualExpenseInput, previous?: ExpenseOccurrence) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('O valor deve ser maior que zero.');
  for (const [catalog, key, oldKey] of [[state.categories, input.categoryId, previous?.categoryId], [state.paymentMethods, input.paymentMethodId, previous?.paymentMethodId]] as const) {
    if (!catalog[key] || (!catalog[key].active && key !== oldKey)) throw new Error('Selecione uma categoria e uma forma de pagamento ativas.');
  }
}
export function addManualExpense(state: ExpenseDomainState, cycleId: string, group: ManualExpenseGroup, input: ManualExpenseInput): ExpenseDomainState {
  validateManualInput(state, input);
  const item = { ...input, id: crypto.randomUUID(), cycleId, group, nature: 'avulso', origin: 'manual' };
  return parseExpenseDomainState(JSON.stringify({ ...state, cycles: { ...state.cycles, [cycleId]: [item, ...(state.cycles[cycleId] ?? [])] } }));
}
export function updateManualExpense(state: ExpenseDomainState, cycleId: string, expenseId: string, input: ManualExpenseInput): ExpenseDomainState {
  const item = state.cycles[cycleId]?.find(value => value.id === expenseId);
  if (!item || item.nature !== 'avulso' || !['carro', 'casa', 'diarias'].includes(item.group)) throw new Error('Lançamento avulso não encontrado.');
  validateManualInput(state, input, item);
  const updated = { ...item, description: input.description, amount: input.amount, categoryId: input.categoryId, paymentMethodId: input.paymentMethodId, date: input.date, note: input.note };
  return parseExpenseDomainState(JSON.stringify({ ...state, cycles: { ...state.cycles, [cycleId]: state.cycles[cycleId].map(value => value.id === expenseId ? updated : value) } }));
}
export function removeManualExpense(state: ExpenseDomainState, cycleId: string, expenseId: string): ExpenseDomainState {
  const item = state.cycles[cycleId]?.find(value => value.id === expenseId);
  if (!item || item.nature !== 'avulso' || !['carro', 'casa', 'diarias'].includes(item.group)) throw new Error('Lançamento avulso não encontrado.');
  return parseExpenseDomainState(JSON.stringify({ ...state, cycles: { ...state.cycles, [cycleId]: state.cycles[cycleId].filter(value => value.id !== expenseId) } }));
}
export function listManualExpenses(state: ExpenseDomainState, cycleId: string, group: ManualExpenseGroup): ExpenseOccurrence[] {
  return (state.cycles[cycleId] ?? []).filter(value => value.group === group && value.nature === 'avulso').sort((a, b) => b.date.localeCompare(a.date));
}
export function saveExpenseCatalogRecord(state: ExpenseDomainState, catalog: 'categories' | 'paymentMethods', input: { id?: string; name: string; active: boolean; type?: PaymentMethod['type'] }): ExpenseDomainState {
  if (input.id !== undefined && !state[catalog][input.id]) throw new Error('Registro não encontrado.');
  const recordId = input.id ?? crypto.randomUUID();
  if (catalog === 'categories' && recordId === 'category-investimento' && input.active) throw new Error('A categoria Investimento foi retirada das despesas.');
  const record = catalog === 'categories' ? { id: recordId, name: input.name, active: input.active } : { id: recordId, name: input.name, active: input.active, type: input.type };
  return parseExpenseDomainState(JSON.stringify({ ...state, [catalog]: { ...state[catalog], [recordId]: record } }));
}