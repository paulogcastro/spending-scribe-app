import { useState } from 'react';
import { IncomeItem } from '@/types/finance';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/ui/sortable-item';

interface IncomeSectionProps {
  items: IncomeItem[];
  onAdd: (item: Omit<IncomeItem, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<IncomeItem>) => void;
  onRemove: (id: string) => void;
  onReorder: (newOrder: string[]) => void;
}

export function IncomeSection({
  items,
  onAdd,
  onUpdate,
  onRemove,
  onReorder
}: IncomeSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    description: '',
    actual: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const totalActual = items.reduce((sum, item) => sum + item.actual, 0);

  const handleAdd = () => {
    if (!newItem.description) return;
    onAdd({
      description: newItem.description,
      planned: 0,
      actual: parseFloat(newItem.actual) || 0,
    });
    setNewItem({
      description: '',
      actual: ''
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
    <div className="border border-border p-5 shadow-card bg-card rounded-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold">Renda</h3>
        </div>
        <Button size="sm" variant="outline" aria-label="Adicionar renda" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

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
                        {item.note && <span className="text-xs text-muted-foreground ml-1">{item.note}</span>}
                      </div>
                    )}
                  </div>
                  <div className="col-span-4">
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
                value={parseFloat(newItem.actual) || 0}
                onChange={value => setNewItem({ ...newItem, actual: value.toString() })}
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

        {/* Total */}
        <div className="grid grid-cols-12 gap-2 items-center py-2 px-2 border-t border-border mt-2 font-medium ml-6">
          <div className="col-span-7 text-sm">Renda Total</div>
          <div className="col-span-4 text-right text-sm text-primary">{formatCurrency(totalActual)}</div>
          <div className="col-span-1"></div>
        </div>
      </div>
    </div>
  );
}
