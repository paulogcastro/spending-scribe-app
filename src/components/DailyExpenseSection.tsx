import { useState } from 'react';
import { DailyExpense, DailyCategory, PaymentSource, dailyCategoryLabels, dailyCategoryIcons, paymentSourceLabels } from '@/types/finance';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Receipt, Target } from 'lucide-react';

interface DailyExpenseSectionProps {
  items: DailyExpense[];
  goal: number;
  onGoalChange: (value: number) => void;
  onAdd: (expense: {
    description: string;
    amount: number;
    category: DailyCategory;
    source: PaymentSource;
    date: string;
  }) => void;
  onRemove: (id: string) => void;
}

export function DailyExpenseSection({
  items,
  goal,
  onGoalChange,
  onAdd,
  onRemove
}: DailyExpenseSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    description: '',
    amount: 0,
    category: 'outros' as DailyCategory,
    source: 'pix' as PaymentSource,
    date: new Date().toISOString().split('T')[0]
  });

  const totalActual = items.reduce((sum, item) => sum + item.amount, 0);
  const difference = goal - totalActual;

  // Group by category
  const byCategory = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {} as Record<DailyCategory, number>);

  const handleAdd = () => {
    if (!newItem.description || !newItem.amount) return;
    onAdd({
      description: newItem.description,
      amount: newItem.amount,
      category: newItem.category,
      source: newItem.source,
      date: newItem.date
    });
    setNewItem({
      description: '',
      amount: 0,
      category: 'outros',
      source: 'pix',
      date: new Date().toISOString().split('T')[0]
    });
    setIsAdding(false);
  };

  // Sort by date descending
  const sortedItems = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="rounded-xl border border-border p-5 shadow-card bg-red-50 dark:bg-red-950/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <Receipt className="h-4 w-4 text-amber-500" />
          </div>
          <h3 className="font-semibold">Despesas Diárias</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Meta input */}
      <div className="flex items-center gap-2 mb-4 p-2 bg-muted/30 rounded-lg flex-wrap">
        <Target className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Projetado:</span>
        <div className="w-28">
          <CurrencyInput
            value={goal}
            onChange={onGoalChange}
            className="h-7 text-xs"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-2">Gasto:</span>
        <span className="text-xs font-medium">{formatCurrency(totalActual)}</span>
        <span className={`text-xs font-medium ml-auto ${difference >= 0 ? 'text-primary' : 'text-destructive'}`}>
          {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
        </span>
      </div>

      {/* Add new item */}
      {isAdding && (
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg mb-4">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Descrição"
              value={newItem.description}
              onChange={e => setNewItem({ ...newItem, description: e.target.value })}
              className="h-9"
              autoFocus
            />
            <CurrencyInput
              value={newItem.amount}
              onChange={value => setNewItem({ ...newItem, amount: value })}
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Select
              value={newItem.category}
              onValueChange={v => setNewItem({ ...newItem, category: v as DailyCategory })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(dailyCategoryLabels) as DailyCategory[]).map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {dailyCategoryIcons[cat]} {dailyCategoryLabels[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={newItem.source}
              onValueChange={v => setNewItem({ ...newItem, source: v as PaymentSource })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(paymentSourceLabels) as PaymentSource[]).map(source => (
                  <SelectItem key={source} value={source}>
                    {paymentSourceLabels[source]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={newItem.date}
              onChange={e => setNewItem({ ...newItem, date: e.target.value })}
              className="h-9"
            />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setIsAdding(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="flex-1" onClick={handleAdd}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Category summary */}
      {Object.keys(byCategory).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(Object.keys(byCategory) as DailyCategory[]).map(cat => (
            <div key={cat} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-muted">
              <span>{dailyCategoryIcons[cat]}</span>
              <span>{dailyCategoryLabels[cat]}</span>
              <span className="font-medium">{formatCurrency(byCategory[cat])}</span>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-2 mb-2">
        <div className="col-span-3">Descrição</div>
        <div className="col-span-2 text-center">Categoria</div>
        <div className="col-span-2 text-center">Fonte</div>
        <div className="col-span-2 text-center">Data</div>
        <div className="col-span-2 text-right">Valor</div>
        <div className="col-span-1"></div>
      </div>

      {/* Items list */}
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {sortedItems.map(item => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-lg hover:bg-muted/50 group">
            <div className="col-span-3 text-sm font-medium truncate">{item.description}</div>
            <div className="col-span-2 text-center">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted">
                {dailyCategoryIcons[item.category]} {dailyCategoryLabels[item.category]}
              </span>
            </div>
            <div className="col-span-2 text-center">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted">
                {paymentSourceLabels[item.source]}
              </span>
            </div>
            <div className="col-span-2 text-center text-sm text-muted-foreground">
              {formatDate(item.date)}
            </div>
            <div className="col-span-2 text-right text-sm font-medium">
              {formatCurrency(item.amount)}
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && !isAdding && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Nenhuma despesa diária registrada. Clique em + para adicionar.
        </div>
      )}

      {/* Total */}
      {items.length > 0 && (
        <div className="flex items-center justify-between py-3 px-2 border-t border-border mt-3 font-medium">
          <span className="text-sm">Total Despesas Diárias</span>
          <span className="text-sm">{formatCurrency(totalActual)}</span>
        </div>
      )}
    </div>
  );
}
