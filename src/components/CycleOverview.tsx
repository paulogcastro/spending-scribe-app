import { CalendarDays, ChevronDown, Wallet } from 'lucide-react';
import type { CyclePlanning } from '@/types/finance';
import type { ExpenseDomainState } from '@/lib/expenseDomain';
import { computeCycleOverview } from '@/lib/cycleOverview';
import { budgetGroupLabels } from '@/lib/cyclePlanning';
import { formatCurrency } from '@/lib/format';
import { GoalProgress } from '@/components/GoalProgress';

export function CycleOverview({ planning, domain, periodLabel, readOnly }: {
  planning: CyclePlanning; domain: ExpenseDomainState; periodLabel: string; readOnly: boolean;
}) {
  const summary = computeCycleOverview(planning, domain);
  const { pace } = summary;
  if (readOnly) return <section aria-label="Acompanhamento do ciclo"><p role="alert" className="text-destructive">Não foi possível recuperar todos os dados do ciclo. Indicadores indisponíveis para preservar suas informações.</p></section>;
  const balanceTone = summary.balanceAfterReserve < 0 ? 'text-destructive' : summary.balanceAfterReserve > 0 ? 'text-success' : 'text-foreground';
  const expenseTone = summary.expenses > 0 && summary.expenses > summary.mainExpenseGoal ? 'text-destructive' : 'text-foreground';
  return <section aria-label="Acompanhamento do ciclo" className="space-y-3">
    <h2 className="text-base font-semibold">Acompanhamento do ciclo</h2>
    <div className="grid grid-cols-1 gap-x-8 gap-y-3 border-y border-border py-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
      <div className="min-w-0"><h3 className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4 shrink-0" />Saldo disponível no ciclo</h3><p className={`mt-1 break-words text-2xl font-semibold tabular-nums ${balanceTone}`}>{formatCurrency(summary.balanceAfterReserve)}</p><p className="mt-1 text-xs text-muted-foreground">Após reserva de investimento: {formatCurrency(summary.totalInvestmentGoal)}</p></div>
      <div className="min-w-0"><h3 className="text-sm text-muted-foreground">Despesas realizadas</h3><p className={`mt-1 break-words text-xl font-semibold tabular-nums ${expenseTone}`}>{formatCurrency(summary.expenses)}</p><p className="mt-1 text-xs text-muted-foreground">Meta do ciclo: {formatCurrency(summary.mainExpenseGoal)}</p></div>
      <div className="grid min-w-0 grid-cols-2 gap-4 sm:col-span-2 lg:col-span-2">
        {[['Disponível por dia', pace.daily], ['Disponível nos próximos 7 dias', pace.weekly]].map(([label, value]) => <div key={label} className="min-w-0"><h3 className="text-sm text-muted-foreground">{label}</h3><p className="mt-1 break-words text-xl font-semibold tabular-nums text-foreground">{pace.hasGoal ? formatCurrency(Number(value)) : '—'}</p><p className="mt-1 text-xs text-muted-foreground">Gastos diários</p></div>)}
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <p className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 shrink-0" />{pace.status === 'closed' ? 'Ciclo encerrado' : pace.status === 'future' ? `Ciclo futuro · ${pace.daysRemaining} dias no período` : `${pace.daysRemaining} dias restantes, incluindo hoje`}</p>
      <p className={pace.remaining < 0 ? 'text-destructive' : ''}>Restante para gastos diários: {pace.hasGoal ? formatCurrency(pace.remaining) : 'Sem meta definida'}</p>
    </div>
    <details className="group border-b border-border pb-2">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">Metas por grupo e detalhes do ciclo<ChevronDown className="h-4 w-4 shrink-0 group-open:rotate-180 motion-reduce:transition-none" /></summary>
      <div className="space-y-4 py-3">
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Renda recebida', summary.income],
            ['Salário planejado', planning.plannedSalary],
            ['Restante da meta de despesas', summary.expenseRemaining],
            ['Meta de investimento', summary.totalInvestmentGoal],
          ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className={`mt-1 break-words text-base font-semibold tabular-nums ${Number(value) < 0 ? 'text-destructive' : 'text-foreground'}`}>{formatCurrency(Number(value))}</dd></div>)}
        </dl>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{(Object.keys(summary.subgoals) as (keyof typeof summary.subgoals)[]).map(group => <div key={group} className="min-w-0 space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-medium">{budgetGroupLabels[group]}</h3><span className="text-xs text-muted-foreground">{summary.subgoals[group].percent}%</span></div>
          <p className="break-words text-sm tabular-nums">{formatCurrency(summary.groupTotals[group])}<span className="text-muted-foreground"> / {formatCurrency(summary.subgoals[group].amount)}</span></p>
          <GoalProgress goal={summary.subgoals[group].amount} actual={summary.groupTotals[group]} period="ciclo" />
          <p className={`text-xs tabular-nums ${summary.groupTotals[group] > summary.subgoals[group].amount ? 'text-destructive' : 'text-muted-foreground'}`}>Restante: {formatCurrency(summary.subgoals[group].amount - summary.groupTotals[group])}</p>
        </div>)}</div>
      </div>
    </details>
  </section>;
}
