import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/format';
import { TrendingUp, TrendingDown, Wallet, Home, Car, CreditCard, Receipt, PiggyBank, Target, BarChart3, Calendar } from 'lucide-react';
import { ExpenseGoals, ExpenseCategory, expenseCategoryLabels, expenseCategoryIcons, DailyExpense } from '@/types/finance';
import { formatDate } from '@/lib/format';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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
  dailyExpenses: DailyExpense[];
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  casa: 'hsl(217, 91%, 60%)',
  carro: 'hsl(25, 95%, 53%)',
  alimentacao: 'hsl(158, 64%, 40%)',
  almoco: 'hsl(140, 60%, 45%)',
  besteira: 'hsl(340, 82%, 52%)',
  lazer: 'hsl(280, 68%, 60%)',
  hobbies: 'hsl(200, 80%, 50%)',
  saude: 'hsl(120, 60%, 45%)',
  roupa: 'hsl(45, 93%, 47%)',
  tiriri: 'hsl(310, 70%, 55%)',
  estudos: 'hsl(190, 75%, 50%)',
  investimento: 'hsl(270, 60%, 55%)',
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
  expensesByCategory,
  dailyExpenses
}: SummaryPanelProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  
  const isPositive = result >= 0;
  const isAfterInvestmentPositive = resultAfterInvestment >= 0;

  // Prepare chart data including investments
  const chartDataWithInvestments = useMemo(() => {
    const data = Object.entries(expensesByCategory)
      .filter(([_, value]) => value > 0)
      .map(([category, value]) => ({
        name: expenseCategoryLabels[category as ExpenseCategory],
        value,
        category: category as ExpenseCategory
      }));
    
    // Add investments to chart
    if (investmentsTotal > 0) {
      data.push({
        name: expenseCategoryLabels.investimento,
        value: investmentsTotal,
        category: 'investimento' as ExpenseCategory
      });
    }
    
    return data;
  }, [expensesByCategory, investmentsTotal]);

  // Group daily expenses by day for bar chart
  const dailyByDay = useMemo(() => {
    const grouped = dailyExpenses.reduce((acc, item) => {
      const day = item.date;
      acc[day] = (acc[day] || 0) + item.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({
        date: formatDate(date),
        total
      }));
  }, [dailyExpenses]);

  // Calculate total for percentage
  const totalForPercentage = useMemo(() => {
    return chartDataWithInvestments.reduce((sum, item) => sum + item.value, 0);
  }, [chartDataWithInvestments]);

  // Custom tooltip showing percentage
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const percentage = ((value / totalForPercentage) * 100).toFixed(1);
      return (
        <div className="bg-card border border-border rounded-md px-3 py-2 text-xs shadow-lg">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-muted-foreground">{percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card h-full max-h-[calc(100vh-200px)] overflow-y-auto">
      <h3 className="font-semibold mb-4 flex items-center gap-2 sticky top-0 bg-card pb-2">
        <Wallet className="h-4 w-4" />
        Resumo
      </h3>

      <div className="space-y-4">
        {/* Expense summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Gasto Projetado</div>
            <div className="text-sm font-semibold">{formatCurrency(expensesPlanned)}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Gasto Real</div>
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
            <span>Meta de Investimento</span>
            <span className="font-medium">{formatCurrency(investmentGoal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Investido</span>
            <span className="font-medium text-purple-400">{formatCurrency(investmentsTotal)}</span>
          </div>
          <div className={`p-3 rounded-lg ${isAfterInvestmentPositive ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs">Resultado - Investido</span>
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
            <div className="text-right">Projetado</div>
            <div className="text-right">Real</div>
            <div className="text-right">Dif</div>
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
          {chartDataWithInvestments.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartDataWithInvestments}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartDataWithInvestments.map(entry => (
                    <Cell
                      key={entry.category}
                      fill={CATEGORY_COLORS[entry.category]}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '10px' }}
                  formatter={value => <span className="text-xs text-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Sem dados para exibir
            </div>
          )}

          {/* Category list with percentage on hover */}
          <div className="space-y-1">
            {chartDataWithInvestments
              .sort((a, b) => b.value - a.value)
              .map(({ category, value, name }) => {
                const percentage = ((value / totalForPercentage) * 100).toFixed(1);
                const isHovered = hoveredCategory === category;
                
                return (
                  <div
                    key={category}
                    className="flex items-center justify-between text-sm py-1 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onMouseEnter={() => setHoveredCategory(category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{expenseCategoryIcons[category]}</span>
                      <span>{name}</span>
                    </div>
                    <span className="font-medium tabular-nums">
                      {isHovered ? `${percentage}%` : formatCurrency(value)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Daily expenses by day bar chart */}
        {dailyByDay.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Despesas por Dia
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 9 }} 
                  stroke="hsl(var(--muted-foreground))"
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis 
                  tick={{ fontSize: 9 }} 
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => `R$${value}`}
                  width={50}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Total']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    fontSize: '12px'
                  }}
                />
                <Bar 
                  dataKey="total" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
