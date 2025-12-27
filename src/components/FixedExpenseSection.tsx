import { useState } from 'react';
import { FixedExpenseItem } from '@/types/finance';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Plus, Trash2, Home, Car, Target } from 'lucide-react';

interface FixedExpenseSectionProps {
  title: string;
  type: 'casa' | 'carro';
  items: FixedExpenseItem[];
  goal: number;
  onGoalChange: (value: number) => void;
  onAdd: (item: Omit<FixedExpenseItem, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<FixedExpenseItem>) => void;
  onRemove: (id: string) => void;
}

export function FixedExpenseSection({
  title,
  type,
  items,
  goal,
  onGoalChange,
  onAdd,
  onUpdate,
  onRemove
}: FixedExpenseSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    description: '',
    actual: 0,
    installments: '',
    note: ''
  });

  const totalActual = items.reduce((sum, item) => sum + item.actual, 0);
  const difference = goal - totalActual;

  const Icon = type === 'casa' ? Home : Car;
  const iconColor = type === 'casa' ? 'text-blue-500' : 'text-orange-500';
  const bgIconColor = type === 'casa' ? 'bg-blue-500/10' : 'bg-orange-500/10';
  const isCarro = type === 'carro';

  const handleAdd = () => {
    if (!newItem.description) return;
    onAdd({
      description: newItem.description,
      actual: newItem.actual,
      installments: isCarro ? newItem.installments || undefined : undefined,
      note: newItem.note || undefined
    });
    setNewItem({
      description: '',
      actual: 0,
      installments: '',
      note: ''
    });
    setIsAdding(false);
  };

  return (
    <div className="rounded-xl border border-border p-5 shadow-card bg-red-50 dark:bg-red-950/20 col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgIconColor}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Meta input */}
      <div className="flex items-center gap-2 mb-4 p-2 bg-muted/30 rounded-lg">
        <Target className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Projetado:</span>
        <div className="w-28">
          <CurrencyInput
            value={goal}
            onChange={onGoalChange}
            className="h-7 text-xs"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-2">Real:</span>
        <span className="text-xs font-medium">{formatCurrency(totalActual)}</span>
        <span className={`text-xs font-medium ml-auto ${difference >= 0 ? 'text-primary' : 'text-destructive'}`}>
          {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
        </span>
      </div>

      <div className="space-y-2">
        {/* Header */}
        <div className={`grid ${isCarro ? 'grid-cols-12' : 'grid-cols-12'} gap-2 text-xs text-muted-foreground font-medium px-2`}>
          <div className={isCarro ? 'col-span-5' : 'col-span-8'}>Descrição</div>
          {isCarro && <div className="col-span-3 text-center">Parcelas</div>}
          <div className="col-span-3 text-right">Valor</div>
          <div className="col-span-1"></div>
        </div>

        {/* Items */}
        {items.map(item => (
          <div key={item.id} className={`grid ${isCarro ? 'grid-cols-12' : 'grid-cols-12'} gap-2 items-center py-2 px-2 rounded-lg hover:bg-muted/50 group`}>
            <div className={isCarro ? 'col-span-5' : 'col-span-8'} style={{
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <span className="truncate">{item.description}</span>
              {item.note && <span className="text-xs text-muted-foreground">{item.note}</span>}
            </div>
            {isCarro && (
              <div className="col-span-3">
                <Input
                  type="text"
                  placeholder="1/12"
                  value={item.installments || ''}
                  onChange={e => onUpdate(item.id, { installments: e.target.value })}
                  className="h-8 text-center text-sm"
                />
              </div>
            )}
            <div className="col-span-3">
              <CurrencyInput
                value={item.actual}
                onChange={value => onUpdate(item.id, { actual: value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {/* Add new item */}
        {isAdding && (
          <div className={`grid ${isCarro ? 'grid-cols-12' : 'grid-cols-12'} gap-2 items-center py-2 px-2 bg-muted/30 rounded-lg`}>
            <div className={isCarro ? 'col-span-5' : 'col-span-8'}>
              <Input
                placeholder="Descrição"
                value={newItem.description}
                onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            {isCarro && (
              <div className="col-span-3">
                <Input
                  type="text"
                  placeholder="1/12"
                  value={newItem.installments}
                  onChange={e => setNewItem({ ...newItem, installments: e.target.value })}
                  className="h-8 text-center text-sm"
                />
              </div>
            )}
            <div className="col-span-3">
              <CurrencyInput
                value={newItem.actual}
                onChange={value => setNewItem({ ...newItem, actual: value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-1 flex justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                ✕
              </Button>
              <Button size="sm" onClick={handleAdd}>
                ✓
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 && !isAdding && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Nenhum item. Clique em + para adicionar.
          </div>
        )}

        {/* Total */}
        {items.length > 0 && (
          <div className={`grid ${isCarro ? 'grid-cols-12' : 'grid-cols-12'} gap-2 items-center py-2 px-2 border-t border-border mt-2 font-medium`}>
            <div className={isCarro ? 'col-span-8' : 'col-span-8'} style={{ fontSize: '0.875rem' }}>
              Total {title}
            </div>
            <div className="col-span-3 text-right" style={{ fontSize: '0.875rem' }}>
              {formatCurrency(totalActual)}
            </div>
            <div className="col-span-1"></div>
          </div>
        )}
      </div>
    </div>
  );
}
