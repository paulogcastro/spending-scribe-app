import { useState } from 'react';
import { DailyExpense, DailyCategory, dailyCategoryLabels, dailyCategoryIcons } from '@/types/finance';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Receipt } from 'lucide-react';

interface DailyExpenseSectionProps {
  items: DailyExpense[];
  budgetPlanned: number;
  onAdd: (expense: { description: string; amount: number; category: DailyCategory; date: string }) => void;
  onRemove: (id: string) => void;
  onBudgetChange: (value: number) => void;
}

export function DailyExpenseSection({ 
  items, 
  budgetPlanned, 
  onAdd, 
  onRemove,
  onBudgetChange 
}: DailyExpenseSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ 
    description: '', 
    amount: '', 
    category: 'outros' as DailyCategory,
    date: new Date().toISOString().split('T')[0],
  });

  const totalActual = items.reduce((sum, item) => sum + item.amount, 0);
  const difference = budgetPlanned - totalActual;

  // Group by category
  const byCategory = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {} as Record<DailyCategory, number>);

  const handleAdd = () => {
    if (!newItem.description || !newItem.amount) return;
    onAdd({
      description: newItem.description,
      amount: parseFloat(newItem.amount) || 0,
      category: newItem.category,
      date: newItem.date,
    });
    setNewItem({ 
      description: '', 
      amount: '', 
      category: 'outros',
      date: new Date().toISOString().split('T')[0],
    });
    setIsAdding(false);
  };

  // Sort by date descending
  const sortedItems = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
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

      {/* Budget input */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
        <span className="text-sm text-muted-foreground">Orçamento:</span>
        <Input
          type="number"
          value={budgetPlanned || ''}
          onChange={(e) => onBudgetChange(parseFloat(e.target.value) || 0)}
          className="h-8 w-32 text-right"
          placeholder="0.00"
        />
        <span className="text-sm text-muted-foreground">Gasto:</span>
        <span className="text-sm font-medium">{formatCurrency(totalActual)}</span>
        <span className="text-sm text-muted-foreground">Restante:</span>
        <span className={`text-sm font-medium ${difference >= 0 ? 'text-primary' : 'text-destructive'}`}>
          {formatCurrency(difference)}
        </span>
      </div>

      {/* Add new item */}
      {isAdding && (
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg mb-4">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Descrição"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="h-9"
              autoFocus
            />
            <Input
              type="number"
              placeholder="Valor"
              value={newItem.amount}
              onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Select 
              value={newItem.category} 
              onValueChange={(v) => setNewItem({ ...newItem, category: v as DailyCategory })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(dailyCategoryLabels) as DailyCategory[]).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {dailyCategoryIcons[cat]} {dailyCategoryLabels[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={newItem.date}
              onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
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
          {(Object.keys(byCategory) as DailyCategory[]).map((cat) => (
            <div 
              key={cat}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-muted"
            >
              <span>{dailyCategoryIcons[cat]}</span>
              <span>{dailyCategoryLabels[cat]}</span>
              <span className="font-medium">{formatCurrency(byCategory[cat])}</span>
            </div>
          ))}
        </div>
      )}

      {/* Items list */}
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {sortedItems.map((item) => (
          <div 
            key={item.id} 
            className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 group"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{dailyCategoryIcons[item.category]}</span>
              <div>
                <div className="text-sm font-medium">{item.description}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(item.date)} • {dailyCategoryLabels[item.category]}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
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
