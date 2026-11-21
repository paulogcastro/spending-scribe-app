import { CalendarDays, TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { getBudgetPace } from '@/lib/budget';
import { GoalProgress } from '@/components/GoalProgress';

interface Props { monthlyPeriodLabel: string; income: number; expenses: number; investments: number; expenseGoal: number; dailyGoal: number; dailySpent: number; year: number; month: number }
export function BudgetOverview({ monthlyPeriodLabel, income, expenses, investments, expenseGoal, dailyGoal, dailySpent, year, month }: Props) {
  const pace = getBudgetPace(dailyGoal, dailySpent, year, month);
  const balance = income - expenses - investments;
  const metrics = [
    { label: 'Renda mensal', value: income, icon: TrendingUp, tone: 'text-primary' },
    { label: 'Despesas mensais', value: expenses, icon: TrendingDown, tone: 'text-destructive' },
    { label: 'Saldo mensal após investimentos', value: balance, icon: Wallet, tone: balance >= 0 ? 'text-primary' : 'text-destructive' },
    { label: 'Total investido mensal', value: investments, icon: PiggyBank, tone: 'text-category-entertainment' },
  ];
  return <section className="space-y-5" aria-label="Acompanhamento mensal anterior">
    <p className="text-xs text-muted-foreground">{monthlyPeriodLabel}</p>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2"><p className="text-xs sm:text-sm text-muted-foreground">{label}</p><Icon className={`h-4 w-4 shrink-0 ${tone}`} /></div>
        <p className={`mt-3 break-words text-xl sm:text-2xl font-semibold tabular-nums ${tone}`}>{formatCurrency(value)}</p>
        {label === 'Despesas mensais' && <p className="mt-1 text-xs text-muted-foreground">{expenseGoal > 0 ? `${Math.round(expenses / expenseGoal * 100)}% da meta mensal` : 'Sem meta mensal'}</p>}
      </div>)}
    </div>
    <div className="grid gap-4 border-y border-border py-5 lg:grid-cols-[1fr_1.3fr] lg:gap-10">
      <div><h2 className="flex items-center gap-2 text-base font-semibold"><CalendarDays className="h-4 w-4 text-primary" />Ritmo de gastos · controle mensal anterior</h2>
        <p className="mt-1 text-xs text-muted-foreground">{monthlyPeriodLabel} · meta mensal de despesas diárias, não a submeta do ciclo</p>
        <p className="mt-1 mb-3 text-xs text-muted-foreground">Despesas diárias · {pace.daysRemaining > 0 ? `${pace.daysRemaining} dias restantes, incluindo hoje` : 'Mês encerrado'}</p>
        <GoalProgress goal={dailyGoal} actual={dailySpent} />
      </div>
      <div className="grid grid-cols-3 gap-3 items-center">
        {[['Restante da meta', pace.remaining], ['Por dia', pace.daily], ['Próximos 7 dias', pace.weekly]].map(([label, value]) => <div key={label}>
          <p className="text-xs text-muted-foreground">{label}</p><p className={`mt-2 text-lg sm:text-xl font-semibold tabular-nums break-words ${Number(value) < 0 ? 'text-destructive' : 'text-foreground'}`}>{pace.hasGoal ? formatCurrency(Number(value)) : '—'}</p>
        </div>)}
      </div>
    </div>
  </section>;
}