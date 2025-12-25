import { formatCurrency } from '@/lib/format';
import { TrendingUp, TrendingDown, Wallet, Home, Car, CreditCard, Receipt, PiggyBank, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ExpenseGoals } from '@/types/finance';

interface SummaryPanelProps {
  expensesPlanned: number;
  expensesActual: number;
  casaPlanned: number;
  casaActual: number;
  carroPlanned: number;
  carroActual: number;
  parceladosPlanned: number;
  parceladosActual: number;
  diariasTotal: number;
  diariasGoal: number;
  incomeActual: number;
  investmentsTotal: number;
  investmentGoal: number;
  result: number;
  resultAfterInvestment: number;
  expenseGoals: ExpenseGoals;
  onInvestmentGoalChange: (value: number) => void;
  onExpenseGoalChange: (group: keyof ExpenseGoals, value: number) => void;
}

export function SummaryPanel({
  expensesPlanned,
  expensesActual,
  casaPlanned,
  casaActual,
  carroPlanned,
  carroActual,
  parceladosPlanned,
  parceladosActual,
  diariasTotal,
  diariasGoal,
  incomeActual,
  investmentsTotal,
  investmentGoal,
  result,
  resultAfterInvestment,
  expenseGoals,
  onInvestmentGoalChange,
  onExpenseGoalChange,
}: SummaryPanelProps) {
  const isPositive = result >= 0;
  const isAfterInvestmentPositive = resultAfterInvestment >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Wallet className="h-4 w-4" />
        Resumo
      </h3>

      <div className="space-y-4">
        {/* Expense summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Planejado</div>
            <div className="text-sm font-semibold">{formatCurrency(expensesPlanned)}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Atual</div>
            <div className="text-sm font-semibold">{formatCurrency(expensesActual)}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Diferença</div>
            <div className={`text-sm font-semibold ${expensesPlanned - expensesActual >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(expensesPlanned - expensesActual)}
            </div>
          </div>
        </div>

        {/* Income vs Expenses */}
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>Renda Total</span>
            </div>
            <div className="text-sm font-medium">{formatCurrency(incomeActual)}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span>Despesas Totais</span>
            </div>
            <div className="text-sm font-medium">{formatCurrency(expensesActual)}</div>
          </div>
        </div>

        {/* Result */}
        <div className={`p-4 rounded-lg ${isPositive ? 'bg-primary/10' : 'bg-destructive/10'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Resultado</span>
            <span className={`text-lg font-bold ${isPositive ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(result)}
            </span>
          </div>
        </div>

        {/* Investment Goal */}
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-2">
            <PiggyBank className="h-3 w-3" />
            Meta de Investimento
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={investmentGoal || ''}
              onChange={(e) => onInvestmentGoalChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="h-8 text-right text-sm"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Investido</span>
            <span className="font-medium text-emerald-600">{formatCurrency(investmentsTotal)}</span>
          </div>
          <div className={`p-3 rounded-lg ${isAfterInvestmentPositive ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs">Resultado - Meta</span>
              <span className={`text-sm font-bold ${isAfterInvestmentPositive ? 'text-emerald-600' : 'text-destructive'}`}>
                {formatCurrency(resultAfterInvestment)}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown with goals */}
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-2">
            <Target className="h-3 w-3" />
            Despesas por Grupo
          </div>
          
          {/* Header */}
          <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground px-1">
            <div></div>
            <div className="text-right">Meta</div>
            <div className="text-right">Atual</div>
            <div className="text-right">Diff</div>
          </div>

          {/* Casa */}
          <div className="grid grid-cols-4 gap-2 items-center text-sm">
            <div className="flex items-center gap-2">
              <Home className="h-3 w-3 text-blue-500" />
              <span>Casa</span>
            </div>
            <Input
              type="number"
              value={expenseGoals.casa || ''}
              onChange={(e) => onExpenseGoalChange('casa', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="h-7 text-right text-xs"
            />
            <div className="text-right">{formatCurrency(casaActual)}</div>
            <div className={`text-right text-xs ${(expenseGoals.casa || 0) - casaActual >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency((expenseGoals.casa || 0) - casaActual)}
            </div>
          </div>

          {/* Carro */}
          <div className="grid grid-cols-4 gap-2 items-center text-sm">
            <div className="flex items-center gap-2">
              <Car className="h-3 w-3 text-orange-500" />
              <span>Carro</span>
            </div>
            <Input
              type="number"
              value={expenseGoals.carro || ''}
              onChange={(e) => onExpenseGoalChange('carro', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="h-7 text-right text-xs"
            />
            <div className="text-right">{formatCurrency(carroActual)}</div>
            <div className={`text-right text-xs ${(expenseGoals.carro || 0) - carroActual >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency((expenseGoals.carro || 0) - carroActual)}
            </div>
          </div>

          {/* Parcelados */}
          <div className="grid grid-cols-4 gap-2 items-center text-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-3 w-3 text-purple-500" />
              <span>Parcelados</span>
            </div>
            <Input
              type="number"
              value={expenseGoals.parcelados || ''}
              onChange={(e) => onExpenseGoalChange('parcelados', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="h-7 text-right text-xs"
            />
            <div className="text-right">{formatCurrency(parceladosActual)}</div>
            <div className={`text-right text-xs ${(expenseGoals.parcelados || 0) - parceladosActual >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency((expenseGoals.parcelados || 0) - parceladosActual)}
            </div>
          </div>

          {/* Diárias */}
          <div className="grid grid-cols-4 gap-2 items-center text-sm">
            <div className="flex items-center gap-2">
              <Receipt className="h-3 w-3 text-amber-500" />
              <span>Diárias</span>
            </div>
            <Input
              type="number"
              value={expenseGoals.diarias || ''}
              onChange={(e) => onExpenseGoalChange('diarias', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="h-7 text-right text-xs"
            />
            <div className="text-right">{formatCurrency(diariasTotal)}</div>
            <div className={`text-right text-xs ${(expenseGoals.diarias || 0) - diariasTotal >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency((expenseGoals.diarias || 0) - diariasTotal)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
