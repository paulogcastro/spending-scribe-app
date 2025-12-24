import { Category, categoryLabels, categoryIcons } from '@/types/expense';
import { formatCurrency } from '@/lib/format';

interface SummaryCardsProps {
  total: number;
  categoryTotals: Record<Category, number>;
}

const categoryColorClasses: Record<string, string> = {
  food: 'bg-category-food/10 text-category-food',
  transport: 'bg-category-transport/10 text-category-transport',
  entertainment: 'bg-category-entertainment/10 text-category-entertainment',
  shopping: 'bg-category-shopping/10 text-category-shopping',
  health: 'bg-category-health/10 text-category-health',
  bills: 'bg-category-bills/10 text-category-bills',
  other: 'bg-category-other/10 text-category-other',
};

export function SummaryCards({ total, categoryTotals }: SummaryCardsProps) {
  const sortedCategories = Object.entries(categoryTotals)
    .filter(([_, value]) => value > 0)
    .sort(([, a], [, b]) => b - a) as [Category, number][];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <p className="text-sm text-muted-foreground mb-1">Total do Mês</p>
        <p className="text-3xl font-bold text-destructive">
          -{formatCurrency(total)}
        </p>
      </div>

      {sortedCategories.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Por Categoria</p>
          <div className="grid gap-2">
            {sortedCategories.map(([category, value]) => (
              <div
                key={category}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-card"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-md text-sm ${categoryColorClasses[category]}`}
                  >
                    {categoryIcons[category]}
                  </span>
                  <span className="text-sm font-medium">
                    {categoryLabels[category]}
                  </span>
                </div>
                <span className="font-medium">{formatCurrency(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
