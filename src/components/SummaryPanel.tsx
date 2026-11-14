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
  casa: 'hsl(var(--category-transport))', carro: 'hsl(var(--category-food))',
  alimentacao: 'hsl(var(--primary))', almoco: 'hsl(var(--category-health))',
  besteira: 'hsl(var(--category-shopping))', lazer: 'hsl(var(--category-entertainment))',
  hobbies: 'hsl(var(--category-hobbies))', saude: 'hsl(var(--category-health))',
  roupa: 'hsl(var(--category-bills))', tiriri: 'hsl(var(--category-tiriri))',
  estudos: 'hsl(var(--category-studies))', investimento: 'hsl(var(--category-entertainment))',
  outros: 'hsl(var(--category-other))'
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

  // 100% = income for percentage calculation
  const totalForPercentage = incomeActual;

  // Chart data with "Disponível" slice
  const chartDataFull = useMemo(() => {
    const usedTotal = chartDataWithInvestments.reduce((sum, item) => sum + item.value, 0);
    const remaining = Math.max(0, incomeActual - usedTotal);
    const data = [...chartDataWithInvestments];
    if (remaining > 0) {
      data.push({
        name: 'Disponível',
        value: remaining,
        category: 'disponivel' as ExpenseCategory
      });
    }
    return data;
  }, [chartDataWithInvestments, incomeActual]);

  // Custom tooltip showing percentage
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const percentage = totalForPercentage > 0 ? ((value / totalForPercentage) * 100).toFixed(1) : '0.0';
      return (
        <div className="bg-card border border-border rounded-md px-3 py-2 text-xs shadow-lg">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-muted-foreground">{formatCurrency(value)} ({percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-background space-y-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2 pb-2">
        <Wallet className="h-4 w-4" />
        Resumo
      </h3>

      <div className="grid gap-6 lg:grid-cols-2 [&>div]:min-w-0">
        {/* Expense summary */}
        <div className="grid grid-cols-3 gap-2 text-center lg:col-span-2">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Meta de despesas</div>
            <div className="text-sm font-semibold break-words">{formatCurrency(expensesPlanned)}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Gasto atual</div>
            <div className="text-sm font-semibold break-words">{formatCurrency(expensesActual)}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Diferença</div>
            <div className={`text-sm font-semibold break-words ${expensesPlanned - expensesActual >= 0 ? 'text-primary' : 'text-destructive'}`}>
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
            <span className="font-medium text-category-entertainment">{formatCurrency(investmentsTotal)}</span>
          </div>
          <div className={`p-3 rounded-lg ${isAfterInvestmentPositive ? 'bg-primary/10' : 'bg-destructive/10'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs">Resultado - Meta de investimento</span>
              <span className={`text-sm font-bold ${isAfterInvestmentPositive ? 'text-primary' : 'text-destructive'}`}>
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
            <div className="text-right">Real</div>
            <div className="text-right">Dif</div>
          </div>

          {/* Casa */}
          <div className="grid grid-cols-4 gap-2 items-center text-sm">
            <div className="flex items-center gap-2">
              <Home className="h-3 w-3 text-category-transport" />
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
              <Car className="h-3 w-3 text-category-food" />
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
              <CreditCard className="h-3 w-3 text-category-entertainment" />
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
              <Receipt className="h-3 w-3 text-category-food" />
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
        <div className="space-y-3 pt-3 border-t border-border lg:col-span-2">
          <div className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-2">
            <BarChart3 className="h-3 w-3" />
            Uso do Dinheiro
          </div>
          
          {/* Pie Chart */}
          {chartDataFull.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartDataFull}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartDataFull.map(entry => (
                    <Cell
                      key={entry.category}
                      fill={entry.category === ('disponivel' as any) ? 'hsl(var(--muted))' : (CATEGORY_COLORS[entry.category] || 'hsl(var(--category-other))')}
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
            {[...chartDataFull]
              .sort((a, b) => b.value - a.value)
              .map(({ category, value, name }) => {
                const percentage = totalForPercentage > 0 ? ((value / totalForPercentage) * 100).toFixed(1) : '0.0';
                const isHovered = hoveredCategory === category;
                
                return (
                  <div
                    key={category}
                    className="flex items-center justify-between text-sm py-1 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onMouseEnter={() => setHoveredCategory(category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{category === ('disponivel' as any) ? '💵' : expenseCategoryIcons[category]}</span>
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
          <div className="space-y-3 pt-3 border-t border-border lg:col-span-2">
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
