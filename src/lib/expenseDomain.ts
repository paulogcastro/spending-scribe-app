import { z } from 'zod';
import { adjacentCycle, createFinancialCycle, getFinancialCycle, cycleStartDate } from './financialCycles';

export const EXPENSE_DOMAIN_STORAGE_KEY = 'spending-scribe-expense-domain-v1';
const id = z.string().min(1).refine(value => value.trim() === value && !['__proto__', 'constructor', 'prototype'].includes(value));
const money = z.number().finite().nonnegative();
const natureSchema = z.enum(['avulso', 'recorrente', 'parcelado']);
const groupColorSchema = z.enum(['amber', 'blue', 'purple', 'pink', 'red', 'emerald', 'cyan', 'indigo', 'orange']);

export const budgetGroupSchema = z.object({
  id,
  name: z.string().trim().min(1),
  icon: z.string().min(1),
  color: groupColorSchema,
  order: z.number().int().nonnegative(),
  active: z.boolean(),
  isResidual: z.boolean().optional(),
  allowedNatures: z.array(natureSchema).min(1),
}).strict();

export type BudgetGroupRecord = z.infer<typeof budgetGroupSchema>;

export function defaultBudgetGroups(): Record<string, BudgetGroupRecord> {
  return {
    casa: { id: 'casa', name: 'Casa', icon: 'home', color: 'amber', order: 0, active: true, allowedNatures: ['avulso', 'recorrente', 'parcelado'] },
    carro: { id: 'carro', name: 'Carro', icon: 'car', color: 'blue', order: 1, active: true, allowedNatures: ['avulso', 'recorrente', 'parcelado'] },
    fixos: { id: 'fixos', name: 'Gastos fixos', icon: 'repeat', color: 'purple', order: 2, active: true, allowedNatures: ['recorrente'] },
    parcelados: { id: 'parcelados', name: 'Parcelados', icon: 'credit-card', color: 'pink', order: 3, active: true, allowedNatures: ['parcelado'] },
    diarias: { id: 'diarias', name: 'Gastos diários', icon: 'receipt', color: 'red', order: 999, active: true, isResidual: true, allowedNatures: ['avulso'] },
  };
}

export function isExpenseNatureCompatible(group: string, nature: string, budgetGroups?: Record<string, BudgetGroupRecord>): boolean {
  const custom = budgetGroups?.[group];
  if (custom) return custom.allowedNatures.includes(nature as z.infer<typeof natureSchema>);
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
const common = { id, description: z.string().trim().min(1), amount: money, group: id, categoryId: id, paymentMethodId: id, note: z.string().optional() };
const installment = z.object({ number: z.number().int().positive(), total: z.number().int().positive() }).strict().refine(value => value.number <= value.total);
export const expenseOccurrenceSchema = z.object({
  ...common, cycleId, nature: natureSchema, date,
  origin: z.enum(['manual', 'importacao', 'notificacao']), definitionId: id.optional(), installment: installment.optional(),
}).strict().superRefine((value, ctx) => {
  if ((value.nature === 'parcelado') !== (value.installment !== undefined)) ctx.addIssue({ code: 'custom', message: 'Dados de parcela incompatíveis com a natureza.' });
  if (value.nature === 'avulso' && value.definitionId !== undefined) ctx.addIssue({ code: 'custom', message: 'Despesa avulsa não possui definição permanente.' });
  if (value.nature !== 'avulso' && value.definitionId === undefined) ctx.addIssue({ code: 'custom', message: 'Recorrências e parcelas exigem uma definição permanente.' });
});
const status = z.enum(['ativa', 'suspensa', 'concluida']);
const recurringFields = { ...common, active: z.boolean(), status: status.optional(), startDate: date, endDate: date.optional(), dayOfMonth: z.number().int().min(1).max(31) };
const installmentFields = { ...common, active: z.boolean(), status: status.optional(), startDate: date, totalInstallments: z.number().int().positive(), firstInstallment: z.number().int().positive().optional() };
const recurringRevisionSchema = z.object({ ...recurringFields, effectiveCycleId: cycleId }).strict().refine(value => !value.endDate || value.endDate >= value.startDate);
const installmentRevisionSchema = z.object({ ...installmentFields, effectiveCycleId: cycleId }).strict().refine(value => (value.firstInstallment ?? 1) <= value.totalInstallments);
export const recurringDefinitionSchema = z.object({ ...recurringFields, revisions: z.array(recurringRevisionSchema).optional() }).strict().refine(value => !value.endDate || value.endDate >= value.startDate);
export const installmentDefinitionSchema = z.object({ ...installmentFields, revisions: z.array(installmentRevisionSchema).optional() }).strict().refine(value => (value.firstInstallment ?? 1) <= value.totalInstallments);
const stateSchema = z.object({
  version: z.literal(1), cycles: z.record(z.array(expenseOccurrenceSchema)),
  categories: z.record(expenseCategorySchema), paymentMethods: z.record(paymentMethodSchema),
  budgetGroups: z.record(budgetGroupSchema).optional(),
  skippedCommitments: z.record(z.array(id)).optional(),
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
  const defaultCategories: ExpenseCategoryRecord[] = [
    { id: 'category-moradia', name: 'Moradia', active: true },
    { id: 'category-alimentacao', name: 'Alimentação', active: true },
    { id: 'category-transporte', name: 'Transporte', active: true },
    { id: 'category-saude', name: 'Saúde', active: true },
    { id: 'category-lazer', name: 'Lazer', active: true },
    { id: 'category-educacao', name: 'Educação', active: true },
    { id: 'category-vestuario', name: 'Vestuário', active: true },
    { id: 'category-assinaturas', name: 'Assinaturas', active: true },
    { id: 'category-outros', name: 'Outros', active: true },
  ];
  const paymentMethods: PaymentMethod[] = [
    { id: 'payment-credito', name: 'Cartão de crédito', type: 'cartao_credito', active: true },
    { id: 'payment-debito', name: 'Cartão de débito', type: 'outros', active: true },
    { id: 'payment-pix', name: 'Pix', type: 'pix', active: true },
    { id: 'payment-dinheiro', name: 'Dinheiro', type: 'dinheiro', active: true },
    { id: 'payment-outros', name: 'Outros', type: 'outros', active: true },
  ];
  return {
    version: 1,
    cycles: {},
    categories: Object.fromEntries(defaultCategories.map(value => [value.id, value])),
    paymentMethods: Object.fromEntries(paymentMethods.map(value => [value.id, value])),
    budgetGroups: defaultBudgetGroups(),
    recurringDefinitions: {},
    installmentDefinitions: {},
  };
}

export function getBudgetGroupsMap(state: ExpenseDomainState): Record<string, BudgetGroupRecord> {
  return state.budgetGroups ?? defaultBudgetGroups();
}

export function getOrderedBudgetGroups(state: ExpenseDomainState, includeInactive = false): BudgetGroupRecord[] {
  const groups = Object.values(getBudgetGroupsMap(state)).filter(g => includeInactive || g.active);
  return groups.sort((a, b) => {
    if (a.isResidual || a.id === 'diarias') return 1;
    if (b.isResidual || b.id === 'diarias') return -1;
    return a.order - b.order;
  });
}

export function parseExpenseDomainState(text: string): ExpenseDomainState {
  const state = stateSchema.parse(JSON.parse(text));
  const definitions = [...Object.values(state.recurringDefinitions), ...Object.values(state.installmentDefinitions)];
  const definitionIds = definitions.map(value => value.id);
  if (new Set(definitionIds).size !== definitionIds.length) throw new Error('IDs de definições repetidos.');
  const groupsMap = getBudgetGroupsMap(state);
  const catalogsToCheck = [
    state.categories,
    state.paymentMethods,
    state.recurringDefinitions,
    state.installmentDefinitions,
    ...(state.budgetGroups ? [state.budgetGroups] : []),
  ];
  for (const records of catalogsToCheck) {
    for (const [key, value] of Object.entries(records)) if (id.safeParse(key).success === false || key !== value.id) throw new Error('ID de registro inválido.');
  }
  if (state.budgetGroups && !state.budgetGroups.diarias) throw new Error('O grupo Gastos diários é obrigatório.');
  const occurrenceIds = new Set<string>();
  const definitionCycles = new Set<string>();
  const references = (value: Pick<ExpenseOccurrence, 'categoryId' | 'paymentMethodId' | 'group'>, nature: ExpenseOccurrence['nature']) => {
    if (!Object.prototype.hasOwnProperty.call(state.categories, value.categoryId) || !Object.prototype.hasOwnProperty.call(state.paymentMethods, value.paymentMethodId)) {
      throw new Error('Categoria ou forma de pagamento inexistente.');
    }
    if (!Object.prototype.hasOwnProperty.call(groupsMap, value.group)) throw new Error('Grupo orçamentário inexistente.');
    if (!isExpenseNatureCompatible(value.group, nature, groupsMap)) throw new Error('Grupo incompatível com a natureza da despesa.');
  };
  Object.values(state.recurringDefinitions).forEach(value => {
    references(value, 'recorrente');
    let previous = '';
    for (const revision of value.revisions ?? []) {
      references(revision, 'recorrente');
      if (revision.id !== value.id || revision.effectiveCycleId <= previous) throw new Error('Revisões de definição inválidas.');
      previous = revision.effectiveCycleId;
    }
  });
  Object.values(state.installmentDefinitions).forEach(value => {
    references(value, 'parcelado');
    let previous = '';
    for (const revision of value.revisions ?? []) {
      references(revision, 'parcelado');
      if (revision.id !== value.id || revision.effectiveCycleId <= previous) throw new Error('Revisões de definição inválidas.');
      previous = revision.effectiveCycleId;
    }
  });
  for (const [key, occurrences] of Object.entries(state.cycles)) {
    createFinancialCycle(key);
    for (const occurrence of occurrences) {
      if (key !== occurrence.cycleId || occurrenceIds.has(occurrence.id)) throw new Error('Ciclo ou ID de ocorrência inválido.');
      occurrenceIds.add(occurrence.id);
      references(occurrence, occurrence.nature);
      if (occurrence.definitionId !== undefined) {
        const original = occurrence.nature === 'recorrente' ? state.recurringDefinitions[occurrence.definitionId] : state.installmentDefinitions[occurrence.definitionId];
        const definition = original ? definitionAtCycle(original, key) : undefined;
        if (!definition || definition.group !== occurrence.group) throw new Error('Definição incompatível com a ocorrência.');
        if ('totalInstallments' in definition && occurrence.installment?.total !== definition.totalInstallments) throw new Error('Total de parcelas incompatível com a definição.');
        const link = JSON.stringify([key, occurrence.definitionId]);
        if (definitionCycles.has(link)) throw new Error('Ocorrência duplicada para a definição no ciclo.');
        definitionCycles.add(link);
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
    const used = [...Object.values(state.cycles).flat(), ...allDefinitionRecords(state)].some(value => value.categoryId === investment.id);
    if (used) state.categories[investment.id] = { ...investment, active: false };
    else delete state.categories[investment.id];
  }
  return state;
}

export function saveExpenseDomainState(storage: DomainStorage, state: ExpenseDomainState): void {
  const validated = parseExpenseDomainState(JSON.stringify(state));
  const previous = loadExpenseDomainState(storage); // Invalid stored data must never be silently overwritten.
  const validatedGroups = getBudgetGroupsMap(validated);
  const historical = [...Object.values(previous.cycles).flat(), ...allDefinitionRecords(previous)];
  for (const value of historical) {
    if (
      !Object.prototype.hasOwnProperty.call(validated.categories, value.categoryId) ||
      !Object.prototype.hasOwnProperty.call(validated.paymentMethods, value.paymentMethodId) ||
      !Object.prototype.hasOwnProperty.call(validatedGroups, value.group)
    ) {
      throw new Error('Desative os registros utilizados no histórico, sem excluí-los.');
    }
  }
  storage.setItem(EXPENSE_DOMAIN_STORAGE_KEY, JSON.stringify(validated));
}

export function deactivateExpenseCatalogRecord(state: ExpenseDomainState, catalog: 'categories' | 'paymentMethods', recordId: string): ExpenseDomainState {
  const record = state[catalog][recordId];
  if (!record) throw new Error('Registro não encontrado.');
  return parseExpenseDomainState(JSON.stringify({ ...state, [catalog]: { ...state[catalog], [recordId]: { ...record, active: false } } }));
}

export type ManualExpenseGroup = string;
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
  const groupsMap = getBudgetGroupsMap(state);
  if (!groupsMap[group] || !groupsMap[group].active || !isExpenseNatureCompatible(group, 'avulso', groupsMap)) {
    throw new Error('Este grupo não aceita despesas avulsas.');
  }
  validateManualInput(state, input);
  const item = { ...input, id: crypto.randomUUID(), cycleId, group, nature: 'avulso', origin: 'manual' };
  return parseExpenseDomainState(JSON.stringify({ ...state, cycles: { ...state.cycles, [cycleId]: [item, ...(state.cycles[cycleId] ?? [])] } }));
}
export function updateManualExpense(state: ExpenseDomainState, cycleId: string, expenseId: string, input: ManualExpenseInput): ExpenseDomainState {
  const item = state.cycles[cycleId]?.find(value => value.id === expenseId);
  const groupsMap = getBudgetGroupsMap(state);
  if (!item || item.nature !== 'avulso' || !isExpenseNatureCompatible(item.group, 'avulso', groupsMap)) throw new Error('Lançamento avulso não encontrado.');
  validateManualInput(state, input, item);
  const updated = { ...item, description: input.description, amount: input.amount, categoryId: input.categoryId, paymentMethodId: input.paymentMethodId, date: input.date, note: input.note };
  return parseExpenseDomainState(JSON.stringify({ ...state, cycles: { ...state.cycles, [cycleId]: state.cycles[cycleId].map(value => value.id === expenseId ? updated : value) } }));
}
export function removeManualExpense(state: ExpenseDomainState, cycleId: string, expenseId: string): ExpenseDomainState {
  const item = state.cycles[cycleId]?.find(value => value.id === expenseId);
  const groupsMap = getBudgetGroupsMap(state);
  if (!item || item.nature !== 'avulso' || !isExpenseNatureCompatible(item.group, 'avulso', groupsMap)) throw new Error('Lançamento avulso não encontrado.');
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

export function saveBudgetGroup(
  state: ExpenseDomainState,
  input: { id?: string; name: string; icon: string; color: BudgetGroupRecord['color']; active: boolean }
): ExpenseDomainState {
  const groups = { ...getBudgetGroupsMap(state) };
  if (input.id !== undefined) {
    const existing = groups[input.id];
    if (!existing) throw new Error('Grupo orçamentário não encontrado.');
    if ((existing.isResidual || existing.id === 'diarias') && !input.active) {
      throw new Error('O grupo Gastos diários é obrigatório e não pode ser desativado.');
    }
    groups[input.id] = { ...existing, name: input.name.trim(), icon: input.icon, color: input.color, active: input.active };
  } else {
    const recordId = `group-${crypto.randomUUID().slice(0, 8)}`;
    const maxOrder = Object.values(groups)
      .filter(g => !g.isResidual && g.id !== 'diarias')
      .reduce((max, g) => Math.max(max, g.order), -1);
    groups[recordId] = {
      id: recordId,
      name: input.name.trim(),
      icon: input.icon,
      color: input.color,
      order: maxOrder + 1,
      active: input.active,
      allowedNatures: ['avulso', 'recorrente', 'parcelado'],
    };
  }
  return parseExpenseDomainState(JSON.stringify({ ...state, budgetGroups: groups }));
}

export function reorderBudgetGroups(state: ExpenseDomainState, orderedNonResidualIds: string[]): ExpenseDomainState {
  const groups = { ...getBudgetGroupsMap(state) };
  orderedNonResidualIds.forEach((groupId, index) => {
    const record = groups[groupId];
    if (record && !record.isResidual && record.id !== 'diarias') {
      groups[groupId] = { ...record, order: index };
    }
  });
  return parseExpenseDomainState(JSON.stringify({ ...state, budgetGroups: groups }));
}

export function isCatalogRecordUsed(
  state: ExpenseDomainState,
  catalog: 'categories' | 'paymentMethods' | 'budgetGroups',
  recordId: string,
  plans: Record<string, { distribution: Record<string, number> }> = {}
): boolean {
  const records = [...Object.values(state.cycles).flat(), ...allDefinitionRecords(state)];
  if (catalog === 'categories') return records.some(item => item.categoryId === recordId);
  if (catalog === 'paymentMethods') return records.some(item => item.paymentMethodId === recordId);
  if (records.some(item => item.group === recordId)) return true;
  return Object.values(plans).some(plan => (plan.distribution[recordId] ?? 0) > 0);
}

export function deleteUnusedCatalogRecord(
  state: ExpenseDomainState,
  catalog: 'categories' | 'paymentMethods' | 'budgetGroups',
  recordId: string,
  plans: Record<string, { distribution: Record<string, number> }> = {}
): ExpenseDomainState {
  if (catalog === 'budgetGroups') {
    const groups = { ...getBudgetGroupsMap(state) };
    const existing = groups[recordId];
    if (!existing) throw new Error('Grupo não encontrado.');
    if (existing.isResidual || existing.id === 'diarias') throw new Error('O grupo Gastos diários é obrigatório.');
    if (isCatalogRecordUsed(state, 'budgetGroups', recordId, plans)) {
      throw new Error('Este grupo já foi utilizado e não pode ser excluído. Você pode inativá-lo.');
    }
    delete groups[recordId];
    return parseExpenseDomainState(JSON.stringify({ ...state, budgetGroups: groups }));
  }
  if (!state[catalog][recordId]) throw new Error('Registro não encontrado.');
  if (isCatalogRecordUsed(state, catalog, recordId, plans)) {
    throw new Error('Este registro já foi utilizado e não pode ser excluído. Você pode inativá-lo.');
  }
  const nextCatalog = { ...state[catalog] };
  delete nextCatalog[recordId];
  return parseExpenseDomainState(JSON.stringify({ ...state, [catalog]: nextCatalog }));
}

// Snapshot revisions keep the original schedule available when unvisited historical cycles are opened.
export type CommitmentKind = 'recorrente' | 'parcelado';
export type CommitmentDefinition = RecurringDefinition | InstallmentDefinition;
export type CommitmentStatus = z.infer<typeof status>;
export interface CommitmentInput {
  description: string; amount: number; group: ExpenseOccurrence['group']; categoryId: string;
  paymentMethodId: string; startCycleId: string; dayOfMonth: number; totalInstallments: number; note?: string;
}
function allDefinitionRecords(state: ExpenseDomainState) {
  return [...Object.values(state.recurringDefinitions), ...Object.values(state.installmentDefinitions)].flatMap(value => [value, ...(value.revisions ?? [])]);
}
export function definitionAtCycle<T extends CommitmentDefinition>(definition: T, selected: string): T {
  const revision = definition.revisions?.filter(value => value.effectiveCycleId <= selected).slice(-1)[0];
  return revision ? { ...definition, ...revision } as T : definition;
}
export function cycleDistance(from: string, to: string): number {
  const a = cycleStartDate(from); const b = cycleStartDate(to);
  return (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
}
function startCycle(definition: CommitmentDefinition): string {
  const [year, month, day] = definition.startDate.split('-').map(Number);
  const civil = new Date(0); civil.setFullYear(year, month - 1, day); civil.setHours(12, 0, 0, 0);
  return getFinancialCycle(civil).id;
}
function installmentNumber(definition: InstallmentDefinition, selected: string): number {
  return cycleDistance(startCycle(definition), selected) + (definition.firstInstallment ?? 1);
}
export function installmentProgress(definition: InstallmentDefinition, selected: string): { remaining: number; finalCycleId: string } {
  const value = definitionAtCycle(definition, selected);
  const first = value.firstInstallment ?? 1;
  const civil = cycleStartDate(startCycle(value));
  civil.setMonth(civil.getMonth() + value.totalInstallments - first);
  return { remaining: commitmentStatus(definition, selected) === 'concluida' ? 0 : Math.max(0, value.totalInstallments - Math.max(first, installmentNumber(value, selected)) + 1), finalCycleId: getFinancialCycle(civil).id };
}
export function commitmentStatus(definition: CommitmentDefinition, selected: string): CommitmentStatus {
  const value = definitionAtCycle(definition, selected);
  if (value.status === 'concluida' || ('endDate' in value && value.endDate && selected > value.endDate)) return 'concluida';
  if ('totalInstallments' in value && installmentNumber(value, selected) > value.totalInstallments) return 'concluida';
  return value.status ?? (value.active ? 'ativa' : 'suspensa');
}
function referenceDate(selected: string, day: number): string {
  const civil = cycleStartDate(selected);
  if (day < 4) civil.setMonth(civil.getMonth() + 1);
  const last = new Date(civil); last.setMonth(last.getMonth() + 1, 0);
  civil.setDate(Math.min(day, last.getDate()));
  return localExpenseDate(civil);
}
export function plannedCommitments(state: ExpenseDomainState, selected: string): ExpenseOccurrence[] {
  createFinancialCycle(selected);
  const skipped = new Set(state.skippedCommitments?.[selected] ?? []);
  return [...Object.values(state.recurringDefinitions), ...Object.values(state.installmentDefinitions)].flatMap(original => {
    if (skipped.has(original.id)) return [];
    const value = definitionAtCycle(original, selected);
    if (commitmentStatus(original, selected) !== 'ativa' || selected < startCycle(value)) return [];
    const isInstallment = 'totalInstallments' in value;
    const number = isInstallment ? installmentNumber(value, selected) : 0;
    if (isInstallment && (number < 1 || number > value.totalInstallments)) return [];
    const occurrence: ExpenseOccurrence = {
      id: `commitment:${value.id}:${selected}`, cycleId: selected, definitionId: value.id,
      description: value.description, amount: value.amount, group: value.group, categoryId: value.categoryId,
      paymentMethodId: value.paymentMethodId, note: value.note, origin: 'manual',
      nature: isInstallment ? 'parcelado' : 'recorrente',
      date: referenceDate(selected, 'dayOfMonth' in value ? value.dayOfMonth : Number(value.startDate.slice(-2))),
      ...(isInstallment ? { installment: { number, total: value.totalInstallments } } : {}),
    };
    return [occurrence];
  });
}
export function generateCycleCommitments(state: ExpenseDomainState, selected: string, todayCycle = getFinancialCycle().id): ExpenseDomainState {
  createFinancialCycle(todayCycle);
  const planned = plannedCommitments(state, selected);
  if (selected > todayCycle) return state; // Future projections never become realized expenses through navigation.
  const existing = state.cycles[selected] ?? [];
  const additions = planned.filter(value => !existing.some(item => item.definitionId === value.definitionId));
  if (!additions.length) return state;
  return parseExpenseDomainState(JSON.stringify({ ...state, cycles: { ...state.cycles, [selected]: [...existing, ...additions] } }));
}
export function futureCommitmentCycles(state: ExpenseDomainState, after: string, count = 12) {
  const result: { cycleId: string; items: ExpenseOccurrence[] }[] = [];
  let selected = after;
  for (let i = 0; i < count; i++) {
    selected = adjacentCycle(selected, 1).id;
    result.push({ cycleId: selected, items: plannedCommitments(state, selected) });
  }
  return result;
}
export function futureChangeCycle(selected: string, todayCycle = getFinancialCycle().id): string {
  return adjacentCycle(selected > todayCycle ? selected : todayCycle, 1).id;
}
export function addCommitment(state: ExpenseDomainState, kind: CommitmentKind, input: CommitmentInput): ExpenseDomainState {
  createFinancialCycle(input.startCycleId);
  const groupsMap = getBudgetGroupsMap(state);
  if (!groupsMap[input.group] || !groupsMap[input.group].active || !isExpenseNatureCompatible(input.group, kind, groupsMap)) {
    throw new Error('Este grupo não aceita este tipo de compromisso.');
  }
  validateManualInput(state, { ...input, date: input.startCycleId });
  const { startCycleId, dayOfMonth, totalInstallments, ...fields } = input;
  const recordId = crypto.randomUUID();
  const record = { ...fields, id: recordId, active: true, status: 'ativa', startDate: startCycleId,
    ...(kind === 'recorrente' ? { dayOfMonth } : { totalInstallments }) };
  const catalog = kind === 'recorrente' ? 'recurringDefinitions' : 'installmentDefinitions';
  return parseExpenseDomainState(JSON.stringify({ ...state, [catalog]: { ...state[catalog], [recordId]: record } }));
}
export function reviseCommitment(state: ExpenseDomainState, kind: CommitmentKind, recordId: string, effective: string, input?: CommitmentInput, nextStatus?: CommitmentStatus, todayCycle = getFinancialCycle().id): ExpenseDomainState {
  createFinancialCycle(effective); createFinancialCycle(todayCycle);
  if (effective <= todayCycle) throw new Error('Alterações da definição devem começar em um ciclo futuro.');
  const catalog = kind === 'recorrente' ? 'recurringDefinitions' : 'installmentDefinitions';
  const original = state[catalog][recordId];
  if (!original) throw new Error('Definição não encontrada.');
  const current = definitionAtCycle(original, effective);
  if (commitmentStatus(original, effective) === 'concluida') throw new Error('Compromisso concluído. Cadastre uma nova definição.');
  const { revisions: ignored, ...snapshot } = current;
  void ignored;
  const revision = { ...snapshot, effectiveCycleId: effective };
  if (input) {
    createFinancialCycle(input.startCycleId);
    validateManualInput(state, { ...input, date: input.startCycleId }, { categoryId: current.categoryId, paymentMethodId: current.paymentMethodId } as ExpenseOccurrence);
    Object.assign(revision, { description: input.description, amount: input.amount, group: input.group, categoryId: input.categoryId, paymentMethodId: input.paymentMethodId, note: input.note });
    if (kind === 'recorrente') Object.assign(revision, { dayOfMonth: input.dayOfMonth });
    else {
      // The next number is schedule-based, not based on which past cycles were visited.
      const previousCycle = adjacentCycle(effective, -1).id;
      const prior = definitionAtCycle(original as InstallmentDefinition, previousCycle);
      const nextNumber = Math.max(prior.firstInstallment ?? 1, installmentNumber(prior, previousCycle) + 1);
      if (input.startCycleId < effective || input.totalInstallments < nextNumber) throw new Error('Cronograma futuro ou quantidade de parcelas inválida.');
      Object.assign(revision, { startDate: input.startCycleId, firstInstallment: nextNumber, totalInstallments: input.totalInstallments });
    }
  }
  if (nextStatus) Object.assign(revision, { status: nextStatus, active: nextStatus === 'ativa' });
  const next = { ...original, revisions: [...(original.revisions ?? []).filter(value => value.effectiveCycleId < effective), revision] };
  // Already-materialized records must never be rewritten by a definition edit.
  if (Object.entries(state.cycles).some(([key, items]) => key >= effective && items.some(value => value.definitionId === recordId))) throw new Error('Há ocorrências registradas neste período. Escolha um ciclo posterior.');
  return parseExpenseDomainState(JSON.stringify({ ...state, [catalog]: { ...state[catalog], [recordId]: next } }));
}
export function correctCommitmentOccurrence(state: ExpenseDomainState, selected: string, occurrenceId: string, amount: number): ExpenseDomainState {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('O valor deve ser maior que zero.');
  const existing = state.cycles[selected]?.find(value => value.id === occurrenceId && value.nature !== 'avulso');
  if (!existing) throw new Error('Ocorrência não encontrada neste ciclo.');
  return parseExpenseDomainState(JSON.stringify({ ...state, cycles: { ...state.cycles, [selected]: state.cycles[selected].map(value => value.id === occurrenceId ? { ...value, amount } : value) } }));
}

export function removeCommitmentOccurrenceInCycle(state: ExpenseDomainState, cycleId: string, occurrenceId: string): ExpenseDomainState {
  const existing = state.cycles[cycleId]?.find(value => value.id === occurrenceId && value.nature !== 'avulso');
  if (!existing || !existing.definitionId) throw new Error('Ocorrência de compromisso não encontrada neste ciclo.');
  const currentSkipped = state.skippedCommitments?.[cycleId] ?? [];
  const nextSkipped = currentSkipped.includes(existing.definitionId) ? currentSkipped : [...currentSkipped, existing.definitionId];
  return parseExpenseDomainState(JSON.stringify({
    ...state,
    cycles: { ...state.cycles, [cycleId]: state.cycles[cycleId].filter(value => value.id !== occurrenceId) },
    skippedCommitments: { ...(state.skippedCommitments ?? {}), [cycleId]: nextSkipped },
  }));
}

export function cancelCommitmentFromCycle(
  state: ExpenseDomainState,
  kind: CommitmentKind,
  definitionId: string,
  fromCycleId: string
): ExpenseDomainState {
  createFinancialCycle(fromCycleId);
  const catalog = kind === 'recorrente' ? 'recurringDefinitions' : 'installmentDefinitions';
  const original = state[catalog][definitionId];
  if (!original) throw new Error('Compromisso não encontrado.');
  const nextCycles: ExpenseDomainState['cycles'] = {};
  for (const [key, items] of Object.entries(state.cycles)) {
    nextCycles[key] = key >= fromCycleId ? items.filter(item => item.definitionId !== definitionId) : items;
  }
  const current = definitionAtCycle(original, fromCycleId);
  const { revisions: ignored, ...snapshot } = current;
  void ignored;
  let updatedDef: CommitmentDefinition;
  if (fromCycleId <= startCycle(original)) {
    updatedDef = { ...original, status: 'concluida', active: false, revisions: [] };
  } else {
    const revision = { ...snapshot, effectiveCycleId: fromCycleId, status: 'concluida' as const, active: false };
    updatedDef = {
      ...original,
      revisions: [...(original.revisions ?? []).filter(r => r.effectiveCycleId < fromCycleId), revision] as never,
    };
  }
  return parseExpenseDomainState(JSON.stringify({
    ...state,
    cycles: nextCycles,
    [catalog]: { ...state[catalog], [definitionId]: updatedDef },
  }));
}

export interface CommitmentOccurrenceUpdate {
  description: string;
  amount: number;
  categoryId: string;
  paymentMethodId: string;
  note?: string;
}

export function updateCommitmentOccurrenceInCycle(
  state: ExpenseDomainState,
  cycleId: string,
  occurrenceId: string,
  updates: CommitmentOccurrenceUpdate
): ExpenseDomainState {
  const existing = state.cycles[cycleId]?.find(value => value.id === occurrenceId && value.nature !== 'avulso');
  if (!existing) throw new Error('Ocorrência não encontrada neste ciclo.');
  validateManualInput(state, { ...updates, date: existing.date }, existing);
  const nextOccurrence = {
    ...existing,
    description: updates.description.trim(),
    amount: updates.amount,
    categoryId: updates.categoryId,
    paymentMethodId: updates.paymentMethodId,
    note: updates.note,
  };
  return parseExpenseDomainState(JSON.stringify({
    ...state,
    cycles: { ...state.cycles, [cycleId]: state.cycles[cycleId].map(value => value.id === occurrenceId ? nextOccurrence : value) },
  }));
}

export function updateCommitmentFromCycle(
  state: ExpenseDomainState,
  kind: CommitmentKind,
  definitionId: string,
  fromCycleId: string,
  updates: CommitmentOccurrenceUpdate
): ExpenseDomainState {
  createFinancialCycle(fromCycleId);
  const catalog = kind === 'recorrente' ? 'recurringDefinitions' : 'installmentDefinitions';
  const original = state[catalog][definitionId];
  if (!original) throw new Error('Compromisso não encontrado.');
  const current = definitionAtCycle(original, fromCycleId);
  validateManualInput(
    state,
    { ...updates, date: fromCycleId },
    { categoryId: current.categoryId, paymentMethodId: current.paymentMethodId } as ExpenseOccurrence
  );
  const { revisions: ignored, ...snapshot } = current;
  void ignored;
  const patchedFields = {
    description: updates.description.trim(),
    amount: updates.amount,
    categoryId: updates.categoryId,
    paymentMethodId: updates.paymentMethodId,
    note: updates.note,
  };
  let updatedDef: CommitmentDefinition;
  if (fromCycleId <= startCycle(original)) {
    updatedDef = {
      ...original,
      ...patchedFields,
      revisions: (original.revisions ?? []).map(rev => ({ ...rev, ...patchedFields })) as never,
    };
  } else {
    const revision = { ...snapshot, ...patchedFields, effectiveCycleId: fromCycleId };
    const laterRevisions = (original.revisions ?? [])
      .filter(r => r.effectiveCycleId > fromCycleId)
      .map(r => ({ ...r, ...patchedFields }));
    updatedDef = {
      ...original,
      revisions: [
        ...(original.revisions ?? []).filter(r => r.effectiveCycleId < fromCycleId),
        revision,
        ...laterRevisions,
      ] as never,
    };
  }
  const nextCycles: ExpenseDomainState['cycles'] = {};
  for (const [key, items] of Object.entries(state.cycles)) {
    nextCycles[key] = key >= fromCycleId
      ? items.map(item => (item.definitionId === definitionId ? { ...item, ...patchedFields } : item))
      : items;
  }
  return parseExpenseDomainState(JSON.stringify({
    ...state,
    cycles: nextCycles,
    [catalog]: { ...state[catalog], [definitionId]: updatedDef },
  }));
}