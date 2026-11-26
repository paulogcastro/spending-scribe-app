import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Home,
  PiggyBank,
  Receipt,
  Repeat2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { CyclePlanning } from '@/types/finance';
import type { ExpenseDomainState } from '@/lib/expenseDomain';
import { computeCycleOverview } from '@/lib/cycleOverview';
import { budgetGroupLabels } from '@/lib/cyclePlanning';
import { formatCurrency } from '@/lib/format';
import { GoalProgress } from '@/components/GoalProgress';

const groupIcons = {
  carro: Car,
  casa: Home,
  fixos: Repeat2,
  parcelados: CreditCard,
  diarias: Receipt,
} as const;

export function CycleOverview({ planning, domain, periodLabel, readOnly }: {
  planning: CyclePlanning; domain: ExpenseDomainState; periodLabel: string; readOnly: boolean;
}) {
  const summary = computeCycleOverview(planning, domain);
  const { pace } = summary;

  if (readOnly) {
    return (
      <section aria-label="Acompanhamento do ciclo" className="rounded-2xl border border-destructive/30 bg-card p-5 shadow-card">
        <p role="alert" className="text-sm text-destructive">
          Não foi possível recuperar todos os dados do ciclo. Indicadores indisponíveis para preservar suas informações.
        </p>
      </section>
    );
  }

  const isNegativeBalance = summary.balanceAfterReserve < 0;
  const isPositiveBalance = summary.balanceAfterReserve > 0;
  const balanceTone = isNegativeBalance ? 'text-destructive' : isPositiveBalance ? 'text-success' : 'text-foreground';

  const expenseRatio = summary.mainExpenseGoal > 0 ? Math.round((summary.expenses / summary.mainExpenseGoal) * 100) : 0;
  const isOverExpenseLimit = summary.expenses > 0 && summary.expenses > summary.mainExpenseGoal;
  const isNearExpenseLimit = !isOverExpenseLimit && summary.mainExpenseGoal > 0 && expenseRatio >= 70;
  const expenseTone = isOverExpenseLimit ? 'text-destructive' : isNearExpenseLimit ? 'text-warning' : 'text-foreground';

  const timeProgress = pace.totalDays > 0 ? Math.min(100, Math.round((pace.daysElapsed / pace.totalDays) * 100)) : 0;

  return (
    <section aria-label="Acompanhamento do ciclo" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {/* Hero Card: Saldo disponível no ciclo */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card md:col-span-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Wallet className="h-3.5 w-3.5 shrink-0" />
                Saldo disponível no ciclo
              </h2>
              <p className={`mt-1.5 break-words text-3xl font-bold tracking-tight tabular-nums ${balanceTone}`}>
                {formatCurrency(summary.balanceAfterReserve)}
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                isNegativeBalance
                  ? 'bg-destructive/10 text-destructive'
                  : isPositiveBalance
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {isNegativeBalance ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {isNegativeBalance ? 'No vermelho' : isPositiveBalance ? 'Folga no ciclo' : 'Equilibrado'}
            </span>
          </div>

          <div className="space-y-2.5 border-t border-border pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <PiggyBank className="h-3.5 w-3.5 text-investment" />
                Reserva de investimento
              </span>
              <span className="font-semibold tabular-nums text-investment">
                {formatCurrency(summary.totalInvestmentGoal)}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {pace.status === 'closed'
                    ? 'Ciclo encerrado'
                    : pace.status === 'future'
                      ? `Ciclo futuro · ${pace.totalDays} dias`
                      : `${pace.daysElapsed} de ${pace.totalDays} dias (${pace.daysRemaining} restantes)`}
                </span>
                <span className="font-medium tabular-nums text-muted-foreground">{timeProgress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pace.status === 'future' ? 0 : pace.status === 'closed' ? 100 : timeProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card: Despesas realizadas vs Limite */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card md:col-span-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-xs font-medium text-muted-foreground">Despesas realizadas</h3>
              <p className={`mt-1.5 break-words text-2xl font-bold tracking-tight tabular-nums ${expenseTone}`}>
                {formatCurrency(summary.expenses)}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                isOverExpenseLimit
                  ? 'bg-destructive/10 text-destructive'
                  : isNearExpenseLimit
                    ? 'bg-warning/15 text-warning'
                    : 'bg-secondary text-foreground'
              }`}
            >
              {summary.mainExpenseGoal > 0 ? `${expenseRatio}% do limite` : 'Sem limite'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all ${
                  isOverExpenseLimit ? 'bg-destructive' : isNearExpenseLimit ? 'bg-warning' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, expenseRatio)}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Limite do ciclo: <strong className="text-foreground tabular-nums">{formatCurrency(summary.mainExpenseGoal)}</strong>
              </span>
              <span className={`tabular-nums ${summary.expenseRemaining < 0 ? 'font-medium text-destructive' : isNearExpenseLimit ? 'font-medium text-warning' : ''}`}>
                {summary.expenseRemaining >= 0
                  ? `Ainda pode gastar ${formatCurrency(summary.expenseRemaining)}`
                  : `Excedeu o limite em ${formatCurrency(Math.abs(summary.expenseRemaining))}`}
              </span>
            </div>
          </div>
        </div>

        {/* Card: Ritmo diário e semanal */}
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-card md:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Ritmo · Gastos diários
            </h3>
            <span className="text-xs text-muted-foreground tabular-nums">
              {pace.daysRemaining} {pace.daysRemaining === 1 ? 'dia' : 'dias'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-1">
            <div className="rounded-xl bg-secondary/70 p-3">
              <p className="text-xs text-muted-foreground">Disponível por dia</p>
              <p className="mt-0.5 break-words text-lg font-bold tabular-nums text-foreground">
                {pace.hasGoal ? formatCurrency(pace.daily) : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-secondary/70 p-3">
              <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
              <p className="mt-0.5 break-words text-lg font-bold tabular-nums text-foreground">
                {pace.hasGoal ? formatCurrency(pace.weekly) : '—'}
              </p>
            </div>
          </div>
          <p className={`text-xs tabular-nums ${pace.remaining < 0 ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
            Restante em diários: {pace.hasGoal ? formatCurrency(pace.remaining) : 'Sem meta definida'}
          </p>
        </div>
      </div>

      {/* Accordion: Metas por grupo e detalhes do ciclo */}
      <details className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <span>Metas por grupo e detalhes do ciclo</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-muted-foreground">
              5 grupos
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>

        <div className="space-y-4 border-t border-border px-5 py-4">
          <p className="text-xs text-muted-foreground">{periodLabel}</p>

          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Renda recebida', summary.income],
              ['Salário planejado', planning.plannedSalary],
              ['Restante da meta', summary.expenseRemaining],
              ['Meta de investimento', summary.totalInvestmentGoal],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-xl bg-secondary/50 p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className={`mt-1 break-words text-base font-semibold tabular-nums ${Number(value) < 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {formatCurrency(Number(value))}
                </dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(Object.keys(summary.subgoals) as (keyof typeof summary.subgoals)[]).map(group => {
              const Icon = groupIcons[group];
              const actual = summary.groupTotals[group];
              const goal = summary.subgoals[group].amount;
              const isOver = actual > 0 && actual > goal;
              return (
                <div key={group} className="min-w-0 space-y-2 rounded-xl border border-border bg-secondary/35 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {budgetGroupLabels[group]}
                    </h3>
                    <span className="text-xs text-muted-foreground tabular-nums">{summary.subgoals[group].percent}%</span>
                  </div>
                  <p className="break-words text-sm font-bold tabular-nums">
                    {formatCurrency(actual)}
                    <span className="text-xs font-normal text-muted-foreground"> / {formatCurrency(goal)}</span>
                  </p>
                  <GoalProgress goal={goal} actual={actual} period="ciclo" />
                  <p className={`text-xs tabular-nums ${isOver ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                    Restante: {formatCurrency(goal - actual)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </details>
    </section>
  );
}
