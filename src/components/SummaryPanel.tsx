import { formatCurrency } from '@/lib/format';
import { TrendingUp, TrendingDown, Wallet, Home, Car, CreditCard, Receipt, PiggyBank, Target, BarChart3 } from 'lucide-react';
import { ExpenseGoals, ExpenseCategory, expenseCategoryLabels, expenseCategoryIcons } from '@/types/finance';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
interface SummaryPanelProps {
  expensesPlanned: number;
  expensesActual: number;
  casaActual: number;
  carroActual: number;
  parceladosActual: number;
  diariasTotal: number;
  incomeActual: number;
  investmentsTotal: number;
  investmentGoal: number;
  result: number;
  resultAfterInvestment: number;
  expenseGoals: ExpenseGoals;
  expensesByCategory: Record<ExpenseCategory, number>;
}
const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  casa: 'hsl(217, 91%, 60%)',
  carro: 'hsl(25, 95%, 53%)',
  alimentacao: 'hsl(158, 64%, 40%)',
  ifood: 'hsl(340, 82%, 52%)',
  lazer: 'hsl(280, 68%, 60%)',
  hobbies: 'hsl(200, 80%, 50%)',
  saude: 'hsl(120, 60%, 45%)',
  roupa: 'hsl(45, 93%, 47%)',
  outros: 'hsl(220, 10%, 50%)'
};
export function SummaryPanel({
  expensesPlanned,
  expensesActual,
  casaActual,
  carroActual,
  parceladosActual,
  diariasTotal,
  incomeActual,
  investmentsTotal,
  investmentGoal,
  result,
  resultAfterInvestment,
  expenseGoals,
  expensesByCategory
}: SummaryPanelProps) {
  const isPositive = result >= 0;
  const isAfterInvestmentPositive = resultAfterInvestment >= 0;

  // Prepare chart data
  const chartData = Object.entries(expensesByCategory).filter(([_, value]) => value > 0).map(([category, value]) => ({
    name: expenseCategoryLabels[category as ExpenseCategory],
    value,
    category: category as ExpenseCategory
  }));
  return <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Wallet className="h-4 w-4" />
        Resumo
      </h3>

      <div className="space-y-4">
        {/* Expense summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Gasto Projetado </div>
            <div className="text-sm font-semibold">{formatCurrency(expensesPlanned)}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Gasto
Real </div>
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

        {/* Investment */}
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-2">
            <PiggyBank className="h-3 w-3" />
            Investimentos
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Meta</span>
            <span className="font-medium">{formatCurrency(investmentGoal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Investido</span>
            <span className="font-medium text-emerald-600">{formatCurrency(investmentsTotal)}</span>
          </div>
          <div className={`p-3 rounded-lg ${isAfterInvestmentPositive ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs">Resultado</span>
              <span className={`text-sm font-bold ${isAfterInvestmentPositive ? 'text-emerald-600' : 'text-destructive'}`}>
                {formatCurrency(resultAfterInvestment)}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown by Group */}
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
            <div className="text-right text-xs">{formatCurrency(expenseGoals.casa)}</div>
            <div className="text-right text-xs">{formatCurrency(casaActual)}</div>
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
            <div className="text-right text-xs">{formatCurrency(expenseGoals.carro)}</div>
            <div className="text-right text-xs">{formatCurrency(carroActual)}</div>
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
            <div className="text-right text-xs">{formatCurrency(expenseGoals.parcelados)}</div>
            <div className="text-right text-xs">{formatCurrency(parceladosActual)}</div>
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
            <div className="text-right text-xs">{formatCurrency(expenseGoals.diarias)}</div>
            <div className="text-right text-xs">{formatCurrency(diariasTotal)}</div>
            <div className={`text-right text-xs ${(expenseGoals.diarias || 0) - diariasTotal >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency((expenseGoals.diarias || 0) - diariasTotal)}
            </div>
          </div>
        </div>

        {/* Breakdown by Category */}
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-2">
            <BarChart3 className="h-3 w-3" />
            Despesas por Categoria
          </div>
          
          {/* Pie Chart */}
          {chartData.length > 0 ? <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                  {chartData.map(entry => <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category]} stroke="hsl(var(--background))" strokeWidth={2} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
              fontSize: '12px'
            }} />
                <Legend wrapperStyle={{
              fontSize: '10px'
            }} formatter={value => <span className="text-xs text-foreground">{value}</span>} />
              </PieChart>
            </ResponsiveContainer> : <div className="text-center py-4 text-sm text-muted-foreground">
              Sem dados para exibir
            </div>}

          {/* Category list */}
          <div className="space-y-1">
            {(Object.entries(expensesByCategory) as [ExpenseCategory, number][]).filter(([_, value]) => value > 0).sort((a, b) => b[1] - a[1]).map(([category, value]) => <div key={category} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{expenseCategoryIcons[category]}</span>
                    <span>{expenseCategoryLabels[category]}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(value)}</span>
                </div>)}
          </div>
        </div>
      </div>
    </div>;
}