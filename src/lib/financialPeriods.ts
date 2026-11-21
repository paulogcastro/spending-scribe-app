import { createFinancialCycle, cycleDisplayEndDate, cycleStartDate, legacyMonthForCycle } from './financialCycles';

// Presentation context only: never filters, moves or reinterprets monthly records.
export function financialPeriods(cycleId: string) {
  const cycle = createFinancialCycle(cycleId);
  const { year, month } = legacyMonthForCycle(cycleId);
  const nextMonth = month === 11 ? 1 : month + 2;
  const nextYear = month === 11 ? year + 1 : year;
  const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthLabel = cycleStartDate(cycleId).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const displayDate = (date: string) => date.split('-').reverse().join('/');
  return {
    monthly: {
      year, month, yearMonth,
      startDate: `${yearMonth}-01`,
      endDate: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
      label: `Controle mensal anterior · ${monthLabel}`,
    },
    cycle: {
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      label: `Ciclo · ${displayDate(cycle.startDate)} a ${displayDate(cycleDisplayEndDate(cycleId))}`,
    },
  };
}