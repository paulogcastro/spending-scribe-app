import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cycleDisplayEndDate, getFinancialCycle } from '@/lib/financialCycles';
import type { FinancialCycle } from '@/types/finance';

const displayDate = (date: string) => date.split('-').reverse().join('/');

export function CycleSelector({ cycle, onNavigate }: { cycle: FinancialCycle; onNavigate: (direction: -1 | 1) => void }) {
  const isCurrent = cycle.id === getFinancialCycle().id;
  return (
    <nav aria-label="Ciclos financeiros" className="flex items-center gap-1 sm:gap-2">
      <Button variant="ghost" size="icon" aria-label="Ciclo anterior" title="Ciclo anterior" onClick={() => onNavigate(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-[205px] text-center" aria-live="polite">
        <div className="text-xs text-muted-foreground">{isCurrent ? 'Ciclo atual' : 'Ciclo financeiro'}</div>
        <div className="text-sm font-medium tabular-nums">{displayDate(cycle.startDate)} a {displayDate(cycleDisplayEndDate(cycle.id))}</div>
      </div>
      <Button variant="ghost" size="icon" aria-label="Próximo ciclo" title="Próximo ciclo" onClick={() => onNavigate(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}