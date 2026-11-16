import type { FinancialCycle, FinancialCycleState } from '../types/finance';

export const CYCLE_STORAGE_KEY = 'spending-scribe-financial-cycles-v1';
export const CYCLE_START_DAY = 4;
export const CLOSING_REFERENCE_DAY = 9;

// Dates are local civil dates, never UTC instants. endDate is exclusive.
function localDateString(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function cycleStartDate(id: string): Date {
  if (!/^\d{4}-(0[1-9]|1[0-2])-04$/.test(id)) throw new Error('Identificador de ciclo inválido.');
  const [year, month, day] = id.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return date;
}

export function createFinancialCycle(id: string): FinancialCycle {
  const start = cycleStartDate(id);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { id, startDate: id, endDate: localDateString(end) };
}

export function getFinancialCycle(date: Date = new Date()): FinancialCycle {
  if (!Number.isFinite(date.getTime())) throw new Error('Data inválida.');
  const start = new Date(date);
  start.setDate(CYCLE_START_DAY);
  if (date.getDate() < CYCLE_START_DAY) start.setMonth(start.getMonth() - 1);
  return createFinancialCycle(localDateString(start));
}

export function adjacentCycle(id: string, direction: -1 | 1): FinancialCycle {
  const date = cycleStartDate(id);
  date.setMonth(date.getMonth() + direction);
  return createFinancialCycle(localDateString(date));
}

export function selectFinancialCycle(state: FinancialCycleState, cycle: FinancialCycle): FinancialCycleState {
  const canonical = createFinancialCycle(cycle.id);
  return { version: 1, selectedCycleId: canonical.id, cycles: { ...state.cycles, [canonical.id]: canonical } };
}

export function parseCycleState(text: string): FinancialCycleState {
  const value = JSON.parse(text);
  if (!value || value.version !== 1 || typeof value.selectedCycleId !== 'string' || !value.cycles || typeof value.cycles !== 'object' || Array.isArray(value.cycles)) {
    throw new Error('Armazenamento de ciclos inválido.');
  }
  const cycles: Record<string, FinancialCycle> = {};
  for (const [id, entry] of Object.entries(value.cycles)) {
    const expected = createFinancialCycle(id);
    const stored = entry as Partial<FinancialCycle> | null;
    if (!stored || stored.id !== id || stored.startDate !== expected.startDate || stored.endDate !== expected.endDate) throw new Error('Datas de ciclo inválidas.');
    cycles[id] = expected;
  }
  if (!Object.prototype.hasOwnProperty.call(cycles, value.selectedCycleId)) throw new Error('Ciclo selecionado não encontrado.');
  return { version: 1, selectedCycleId: value.selectedCycleId, cycles };
}

type CycleStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function loadCycleState(storage: CycleStorage, today = new Date()): FinancialCycleState {
  const stored = storage.getItem(CYCLE_STORAGE_KEY);
  if (stored !== null) return parseCycleState(stored);
  const cycle = getFinancialCycle(today);
  return { version: 1, selectedCycleId: cycle.id, cycles: { [cycle.id]: cycle } };
}

export function saveCycleState(storage: CycleStorage, state: FinancialCycleState): void {
  const validated = parseCycleState(JSON.stringify(state));
  storage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(validated));
}

// Temporary bridge only: financial modules still use the calendar month of
// the cycle's start. It does not copy or classify historical entries as cycles.
export function legacyMonthForCycle(id: string): { year: number; month: number } {
  const date = cycleStartDate(id);
  return { year: date.getFullYear(), month: date.getMonth() };
}