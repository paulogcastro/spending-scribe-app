import { Expense, categoryLabels, categoryIcons } from '@/types/expense';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';

interface ExpenseListProps {
  expenses: Expense[];
  onRemove: (id: string) => void;
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

export function ExpenseList({ expenses, onRemove }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-3">📝</div>
        <p className="text-muted-foreground">Nenhum gasto registrado ainda.</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Adicione seu primeiro gasto acima.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {expenses.map((expense, index) => (
        <div
          key={expense.id}
          className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 shadow-card transition-all hover:shadow-card-hover animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${categoryColorClasses[expense.category]}`}
            >
              {categoryIcons[expense.category]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{expense.description}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{categoryLabels[expense.category]}</span>
                <span>•</span>
                <span>{formatDate(expense.date)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="font-semibold text-destructive">
              -{formatCurrency(expense.amount)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(expense.id)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
