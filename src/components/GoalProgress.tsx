import { getGoalStatus } from '@/lib/budget';
import { Progress } from '@/components/ui/progress';

export function GoalProgress({ goal, actual, investment = false, period = 'mês' }: { goal: number; actual: number; investment?: boolean; period?: 'mês' | 'ciclo' }) {
  const status = getGoalStatus(goal, actual);
  const color = investment ? '[&>div]:bg-category-entertainment' : status === 'over' ? '[&>div]:bg-destructive' : status === 'warning' ? '[&>div]:bg-warning' : '[&>div]:bg-success';
  return <div className="mb-5 space-y-1.5">
    <Progress aria-label={investment ? 'Progresso de investimento' : 'Uso da meta de gastos'} value={goal > 0 ? Math.min(100, actual / goal * 100) : 0} className={`h-1.5 ${color}`} />
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{goal > 0 ? `${Math.round(actual / goal * 100)}% da meta` : 'Sem meta definida'}</span>
      <span className={status === 'over' && !investment ? 'text-destructive' : ''}>{investment ? (actual >= goal && goal > 0 ? 'Meta alcançada' : `Investimentos do ${period}`) : status === 'over' ? 'Meta ultrapassada' : status === 'warning' ? 'Próximo do limite' : `Gastos do ${period}`}</span>
    </div>
  </div>;
}