import { CalendarDays, PiggyBank, TrendingDown, TrendingUp, Wallet, Target } from 'lucide-react';
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
  const metrics = [
    { label: 'Renda recebida', value: summary.income, icon: TrendingUp, note: `Salário planejado: ${formatCurrency(planning.plannedSalary)}`, tone: 'text-primary' },
    { label: 'Despesas do ciclo', value: summary.expenses, icon: TrendingDown, note: `Meta: ${formatCurrency(summary.mainExpenseGoal)}`, tone: 'text-destructive' },
    { label: 'Restante da meta de despesas', value: summary.expenseRemaining, icon: Target, note: 'Todos os grupos do ciclo', tone: summary.expenseRemaining < 0 ? 'text-destructive' : 'text-success' },
    { label: 'Saldo após reserva de investimento', value: summary.balanceAfterReserve, icon: Wallet, note: `Reserva planejada: ${formatCurrency(summary.totalInvestmentGoal)}`, tone: summary.balanceAfterReserve < 0 ? 'text-destructive' : 'text-primary' },
  ];
  return <section aria-label="Acompanhamento do ciclo" className="space-y-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-semibold">Acompanhamento do ciclo</h2><p className="text-sm text-muted-foreground">{periodLabel}</p></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map(({ label, value, icon: Icon, note, tone }) => <div key={label} className="min-w-0 rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2"><h3 className="text-sm text-muted-foreground">{label}</h3><Icon className={`h-4 w-4 shrink-0 ${tone}`} /></div>
        <p className={`mt-3 break-words text-2xl font-semibold tabular-nums ${tone}`}>{formatCurrency(value)}</p>
        <p className="mt-2 text-xs text-muted-foreground">{note}</p>
      </div>)}
    </div>
    <div className="grid gap-5 border-y border-border py-5 lg:grid-cols-[1fr_1.3fr] lg:gap-8">
      <div className="min-w-0"><h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-primary" />Ritmo de gastos diários</h3>
        <p className="mb-3 mt-1 text-xs text-muted-foreground">{pace.status === 'closed' ? 'Ciclo encerrado' : pace.status === 'future' ? `Ciclo futuro · ${pace.daysRemaining} dias no período` : `${pace.daysRemaining} dias restantes, incluindo hoje`}</p>
        <GoalProgress goal={summary.subgoals.diarias.amount} actual={summary.groupTotals.diarias} period="ciclo" />
        <p className="text-xs text-muted-foreground">Meta: {formatCurrency(summary.subgoals.diarias.amount)} · Gasto: {formatCurrency(summary.groupTotals.diarias)}</p>
      </div>
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-3">
        {[['Restante para gastos diários', pace.remaining], ['Disponível por dia', pace.daily], ['Disponível nos próximos 7 dias', pace.weekly]].map(([label, value]) => <div key={label} className="min-w-0"><h3 className="text-sm text-muted-foreground">{label}</h3><p className={`mt-2 break-words text-2xl font-semibold tabular-nums ${Number(value) < 0 ? 'text-destructive' : 'text-foreground'}`}>{pace.hasGoal ? formatCurrency(Number(value)) : '—'}</p></div>)}
      </div>
    </div>
    <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Metas por grupo</h3><p className="flex items-center gap-2 text-sm text-muted-foreground"><PiggyBank className="h-4 w-4 text-category-entertainment" />Meta de investimento: <span className="font-semibold text-foreground">{formatCurrency(summary.totalInvestmentGoal)}</span></p></div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">{(Object.keys(summary.subgoals) as (keyof typeof summary.subgoals)[]).map(group => <div key={group} className="min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-medium">{budgetGroupLabels[group]}</h4><span className="text-xs text-muted-foreground">{summary.subgoals[group].percent}%</span></div>
        <p className="break-words text-sm tabular-nums">{formatCurrency(summary.groupTotals[group])}<span className="text-muted-foreground"> / {formatCurrency(summary.subgoals[group].amount)}</span></p>
        <GoalProgress goal={summary.subgoals[group].amount} actual={summary.groupTotals[group]} period="ciclo" />
        <p className={`text-xs tabular-nums ${summary.groupTotals[group] > summary.subgoals[group].amount ? 'text-destructive' : 'text-muted-foreground'}`}>Restante: {formatCurrency(summary.subgoals[group].amount - summary.groupTotals[group])}</p>
      </div>)}</div>
    </div>
  </section>;
}