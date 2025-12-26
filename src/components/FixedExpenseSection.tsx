import { useState } from 'react';
import { FixedExpenseItem, ExpenseGoals } from '@/types/finance';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    actual: '',
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
      actual: parseFloat(newItem.actual) || 0,
      installments: isCarro ? newItem.installments || undefined : undefined,
      note: newItem.note || undefined
    });
    setNewItem({
      description: '',
      actual: '',
      installments: '',
      note: ''
    });
    setIsAdding(false);
  };
  return <div className="rounded-xl border border-border p-5 shadow-card bg-red-50 dark:bg-red-950/20">
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
        <Input type="number" value={goal || ''} onChange={e => onGoalChange(parseFloat(e.target.value) || 0)} className="h-7 w-24 text-right text-xs" placeholder="0.00" />
        <span className="text-xs text-muted-foreground ml-2">Atual:</span>
        <span className="text-xs font-medium">{formatCurrency(totalActual)}</span>
        <span className={`text-xs font-medium ml-auto ${difference >= 0 ? 'text-primary' : 'text-destructive'}`}>
          {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
        </span>
      </div>

      <div className="space-y-2">
        {/* Header */}
        <div className={`grid ${isCarro ? 'grid-cols-10' : 'grid-cols-10'} gap-2 text-xs text-muted-foreground font-medium px-2`}>
          <div className={isCarro ? 'col-span-4' : 'col-span-7'}>Descrição</div>
          {isCarro && <div className="col-span-3 text-center">Parcelas</div>}
          <div className="col-span-2" style={{
          textAlign: 'right'
        }}>Atual</div>
          <div className="col-span-1"></div>
        </div>

        {/* Items */}
        {items.map(item => <div key={item.id} className={`grid ${isCarro ? 'grid-cols-10' : 'grid-cols-10'} gap-2 items-center py-2 px-2 rounded-lg hover:bg-muted/50 group`}>
            <div className={isCarro ? 'col-span-4' : 'col-span-7'} style={{
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
              <span className="truncate">{item.description}</span>
              {item.note && <span className="text-xs text-muted-foreground">{item.note}</span>}
            </div>
            {isCarro && <div className="col-span-3">
                <Input type="text" placeholder="1/12" value={item.installments || ''} onChange={e => onUpdate(item.id, {
            installments: e.target.value
          })} className="h-8 text-center text-sm" />
              </div>}
            <div className="col-span-2">
              <Input type="number" value={item.actual || ''} onChange={e => onUpdate(item.id, {
            actual: parseFloat(e.target.value) || 0
          })} className="h-8 text-right text-sm" />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => onRemove(item.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>)}

        {/* Add new item */}
        {isAdding && <div className={`grid ${isCarro ? 'grid-cols-10' : 'grid-cols-10'} gap-2 items-center py-2 px-2 bg-muted/30 rounded-lg`}>
            <div className={isCarro ? 'col-span-4' : 'col-span-7'}>
              <Input placeholder="Descrição" value={newItem.description} onChange={e => setNewItem({
            ...newItem,
            description: e.target.value
          })} className="h-8 text-sm" autoFocus />
            </div>
            {isCarro && <div className="col-span-3">
                <Input type="text" placeholder="1/12" value={newItem.installments} onChange={e => setNewItem({
            ...newItem,
            installments: e.target.value
          })} className="h-8 text-center text-sm" />
              </div>}
            <div className="col-span-2">
              <Input type="number" placeholder="0.00" value={newItem.actual} onChange={e => setNewItem({
            ...newItem,
            actual: e.target.value
          })} className="h-8 text-right text-sm" />
            </div>
            <div className="col-span-1 flex justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                ✕
              </Button>
              <Button size="sm" onClick={handleAdd}>
                ✓
              </Button>
            </div>
          </div>}

        {items.length === 0 && !isAdding && <div className="text-center py-4 text-sm text-muted-foreground">
            Nenhum item. Clique em + para adicionar.
          </div>}

        {/* Total */}
        {items.length > 0 && <div className={`grid ${isCarro ? 'grid-cols-10' : 'grid-cols-10'} gap-2 items-center py-2 px-2 border-t border-border mt-2 font-medium`}>
            <div className={isCarro ? 'col-span-7' : 'col-span-7'} style={{
          fontSize: '0.875rem'
        }}>Total {title}</div>
            <div className="col-span-2" style={{
          textAlign: 'right',
          fontSize: '0.875rem'
        }}>{formatCurrency(totalActual)}</div>
            <div className="col-span-1"></div>
          </div>}
      </div>
    </div>;
}