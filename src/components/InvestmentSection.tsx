import { GoalProgress } from '@/components/GoalProgress';
import { useState } from 'react';
import { InvestmentItem } from '@/types/finance';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Plus, Trash2, PiggyBank, Target } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/ui/sortable-item';

interface InvestmentSectionProps {
  items: InvestmentItem[];
  goal: number;
  onGoalChange: (value: number) => void;
  onAdd: (item: Omit<InvestmentItem, 'id'>) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<InvestmentItem>) => void;
  onReorder: (newOrder: string[]) => void;
}

export function InvestmentSection({
  items,
  goal,
  onGoalChange,
  onAdd,
  onRemove,
  onUpdate,
  onReorder
}: InvestmentSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    description: '',
    amount: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const difference = totalAmount - goal;

  const handleAdd = () => {
    if (!newItem.description) return;
    onAdd({
      description: newItem.description,
      amount: newItem.amount,
    });
    setNewItem({
      description: '',
      amount: 0
    });
    setIsAdding(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems.map(item => item.id));
    }
  };

  return (
    <div className="border border-border p-5 shadow-card bg-card rounded-lg flex-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-category-entertainment/10">
            <PiggyBank className="h-4 w-4 text-category-entertainment" />
          </div>
          <h3 className="font-semibold">Investimentos</h3>
        </div>
        <Button size="sm" variant="outline" aria-label="Adicionar investimento" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Meta input */}
      <div className="flex flex-col gap-1 mb-4 p-2 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 flex-wrap">
          <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground">Meta:</span>
          <div className="w-32 flex-shrink-0">
            <CurrencyInput
              value={goal}
              onChange={onGoalChange}
              className="h-7 text-xs"
            />
          </div>
          <span className="text-xs text-muted-foreground ml-auto">Investido:</span>
          <span className="text-xs font-medium text-category-entertainment">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex items-center justify-end gap-1">
          <span className="text-xs text-muted-foreground">Diferença:</span>
          <span className={`text-xs font-medium ${difference >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
          </span>
        </div>
      </div>

      <GoalProgress goal={goal} actual={totalAmount} investment />

      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-2 pl-8">
          <div className="col-span-7">Descrição</div>
          <div className="col-span-4 text-right">Valor</div>
          <div className="col-span-1"></div>
        </div>

        {/* Items */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
            {items.map(item => (
              <SortableItem key={item.id} id={item.id}>
                <div className="grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-lg hover:bg-muted/50 group">
                  <div className="col-span-7">
                    {editingId === item.id ? (
                      <Input
                        value={item.description}
                        onChange={e => onUpdate(item.id, { description: e.target.value })}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="text-sm cursor-pointer hover:text-primary"
                        onClick={() => setEditingId(item.id)}
                      >
                        {item.description}
                      </div>
                    )}
                  </div>
                  <div className="col-span-4">
                    <CurrencyInput
                      value={item.amount}
                      onChange={value => onUpdate(item.id, { amount: value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => onRemove(item.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>

        {/* Add new item */}
        {isAdding && (
          <div className="grid grid-cols-12 gap-2 items-center py-2 px-2 bg-muted/30 rounded-lg ml-6">
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
              <CurrencyInput
                value={newItem.amount}
                onChange={value => setNewItem({ ...newItem, amount: value })}
                className="h-8 text-sm"
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
          <div className="grid grid-cols-12 gap-2 items-center py-2 px-2 border-t border-border mt-2 font-medium ml-6">
            <div className="col-span-7 text-sm">Total Investido</div>
            <div className="col-span-4 text-right text-sm text-category-entertainment">{formatCurrency(totalAmount)}</div>
            <div className="col-span-1"></div>
          </div>
        )}
      </div>
    </div>
  );
}
