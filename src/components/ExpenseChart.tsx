import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Category, categoryLabels } from '@/types/expense';
import { formatCurrency } from '@/lib/format';

interface ExpenseChartProps {
  data: Record<Category, number>;
}

const COLORS: Record<Category, string> = {
  food: 'hsl(25, 95%, 53%)',
  transport: 'hsl(217, 91%, 60%)',
  entertainment: 'hsl(280, 68%, 60%)',
  shopping: 'hsl(340, 82%, 52%)',
  health: 'hsl(158, 64%, 40%)',
  bills: 'hsl(45, 93%, 47%)',
  other: 'hsl(220, 10%, 50%)',
};

export function ExpenseChart({ data }: ExpenseChartProps) {
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([category, value]) => ({
      name: categoryLabels[category as Category],
      value,
      category: category as Category,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center">
        <p className="text-muted-foreground text-sm">Sem dados para exibir</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.category}
              fill={COLORS[entry.category]}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-md)',
          }}
        />
        <Legend
          formatter={(value) => (
            <span className="text-sm text-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
