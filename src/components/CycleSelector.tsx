import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cycleStartDate, getFinancialCycle } from '@/lib/financialCycles';
import type { FinancialCycle } from '@/types/finance';

function cycleMonthLabel(cycleId: string): string {
  const formatted = cycleStartDate(cycleId).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function CycleSelector({ cycle, onNavigate }: { cycle: FinancialCycle; onNavigate: (direction: -1 | 1) => void }) {
  const isCurrent = cycle.id === getFinancialCycle().id;
  return (
    <nav aria-label="Ciclos financeiros" className="flex w-full items-center justify-between gap-1 rounded-full border border-border bg-card p-1 shadow-card sm:inline-flex sm:w-auto sm:gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 rounded-full"
        aria-label="Ciclo anterior"
        title="Ciclo anterior"
        onClick={() => onNavigate(-1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-0 px-2 text-center sm:min-w-[165px]" aria-live="polite">
        <div className="flex items-center justify-center gap-1.5 text-xs">
          {isCurrent && <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />}
          <span className={isCurrent ? 'font-medium text-primary' : 'text-muted-foreground'}>
            {isCurrent ? 'Ciclo atual' : 'Ciclo financeiro'}
          </span>
        </div>
        <div className="text-sm font-semibold tracking-tight">{cycleMonthLabel(cycle.id)}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full"
        aria-label="Próximo ciclo"
        title="Próximo ciclo"
        onClick={() => onNavigate(1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}