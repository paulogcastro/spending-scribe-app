import { useState } from 'react';
import { InvestmentItem } from '@/types/finance';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, PiggyBank } from 'lucide-react';

interface InvestmentSectionProps {
  items: InvestmentItem[];
  onAdd: (item: Omit<InvestmentItem, 'id'>) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<InvestmentItem>) => void;
}

export function InvestmentSection({
  items,
  onAdd,
  onRemove,
  onUpdate
}: InvestmentSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    description: '',
    amount: ''
  });

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const handleAdd = () => {
    if (!newItem.description) return;
    onAdd({
      description: newItem.description,
      amount: parseFloat(newItem.amount) || 0,
    });
    setNewItem({
      description: '',
      amount: ''
    });
    setIsAdding(false);
  };

  return (
    <div className="border border-border p-5 shadow-card bg-emerald-50 rounded-md w-1/2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <PiggyBank className="h-4 w-4 text-emerald-600" />
          </div>
          <h3 className="font-semibold">Investimentos</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-2">
          <div className="col-span-7">Descrição</div>
          <div className="col-span-4 text-right">Valor</div>
          <div className="col-span-1"></div>
        </div>

        {/* Items */}
        {items.map(item => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-lg hover:bg-muted/50 group">
            <div className="col-span-7 text-sm">
              {item.description}
            </div>
            <div className="col-span-4">
              <Input
                type="number"
                value={item.amount}
                onChange={e => onUpdate(item.id, { amount: parseFloat(e.target.value) || 0 })}
                className="h-8 text-right text-sm"
              />
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

        {/* Add new item */}
        {isAdding && (
          <div className="grid grid-cols-12 gap-2 items-center py-2 px-2 bg-muted/30 rounded-lg">
            <div className="col-span-7">
              <Input
                placeholder="Descrição"
                value={newItem.description}
                onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="col-span-4">
              <Input
                type="number"
                placeholder="0.00"
                value={newItem.amount}
                onChange={e => setNewItem({ ...newItem, amount: e.target.value })}
                className="h-8 text-right text-sm"
              />
            </div>
            <div className="col-span-1 flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAdd}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 && !isAdding && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Nenhum investimento. Clique em + para adicionar.
          </div>
        )}

        {/* Total */}
        {items.length > 0 && (
          <div className="grid grid-cols-12 gap-2 items-center py-2 px-2 border-t border-border mt-2 font-medium">
            <div className="col-span-7 text-sm">Total Investido</div>
            <div className="col-span-4 text-right text-sm text-emerald-600">{formatCurrency(totalAmount)}</div>
            <div className="col-span-1"></div>
          </div>
        )}
      </div>
    </div>
  );
}
