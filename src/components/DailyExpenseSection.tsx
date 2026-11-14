import { GoalProgress } from '@/components/GoalProgress';
import { useState } from 'react';
import { DailyExpense, DailyCategory, PaymentSource, dailyCategoryLabels, dailyCategoryIcons, paymentSourceLabels } from '@/types/finance';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Receipt, Target } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/ui/sortable-item';
import { ImportStatementDialog } from '@/components/ImportStatementDialog';

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
    note?: string;
    importKey?: string;
  }) => void;
  onUpdate: (id: string, updates: Partial<DailyExpense>) => void;
  onRemove: (id: string) => void;
  onReorder: (newOrder: string[]) => void;
}

export function DailyExpenseSection({
  items,
  goal,
  onGoalChange,
  onAdd,
  onUpdate,
  onRemove,
  onReorder
}: DailyExpenseSectionProps) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    description: '',
    amount: 0,
    category: 'outros' as DailyCategory,
    source: 'pix' as PaymentSource,
    date: new Date().toISOString().split('T')[0],
    note: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const visibleItems = items.filter(item => {
    const normalized = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return normalized(`${item.description} ${item.note || ''}`).includes(normalized(query)) && (categoryFilter === 'all' || item.category === categoryFilter) && (sourceFilter === 'all' || item.source === sourceFilter);
  });
  const filtered = query !== '' || categoryFilter !== 'all' || sourceFilter !== 'all';
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
      date: newItem.date,
      note: newItem.note || undefined
    });
    setNewItem({
      description: '',
      amount: 0,
      category: 'outros',
      source: 'pix',
      date: new Date().toISOString().split('T')[0],
      note: ''
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

  const startEditing = (id: string, field: string) => {
    setEditingId(id);
    setEditingField(field);
  };

  const stopEditing = () => {
    setEditingId(null);
    setEditingField(null);
  };

  return (
    <div className="rounded-lg border border-border p-5 shadow-card bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-category-food/10">
            <Receipt className="h-4 w-4 text-category-food" />
          </div>
          <h3 className="font-semibold">Despesas Diárias</h3>
        </div>
        <div className="flex items-center gap-1">
          <ImportStatementDialog existing={items} onImport={list => list.forEach(onAdd)} />
          <Button size="sm" variant="outline" aria-label="Adicionar despesa diária" title="Adicionar despesa diária" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Meta input */}
      <div className="flex items-center gap-2 mb-4 p-2 bg-muted/30 rounded-lg flex-wrap">
        <Target className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Meta:</span>
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

      <GoalProgress goal={goal} actual={totalActual} />

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
            <Input
              placeholder="Observação (opcional)"
              value={newItem.note}
              onChange={e => setNewItem({ ...newItem, note: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
            <CurrencyInput
              value={newItem.amount}
              onChange={value => setNewItem({ ...newItem, amount: value })}
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

      <div className="grid gap-2 sm:grid-cols-[1fr_180px_180px] mb-4">
        <Input aria-label="Buscar despesas" placeholder="Buscar descrição ou observação" value={query} onChange={e => setQuery(e.target.value)} />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger aria-label="Filtrar categoria"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as categorias</SelectItem>{Object.entries(dailyCategoryLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}><SelectTrigger aria-label="Filtrar fonte"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as fontes</SelectItem>{Object.entries(paymentSourceLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select>
      </div>
      {filtered && <div className="flex items-center justify-between gap-2 mb-3 text-xs text-muted-foreground"><span>{visibleItems.length} de {items.length} lançamentos · {formatCurrency(visibleItems.reduce((sum, item) => sum + item.amount, 0))}</span><Button size="sm" variant="ghost" onClick={() => { setQuery(''); setCategoryFilter('all'); setSourceFilter('all'); }}>Limpar filtros</Button></div>}
      {filtered && visibleItems.length === 0 && <p className="text-sm text-muted-foreground py-4">Nenhuma despesa encontrada.</p>}
      <div className="overflow-x-auto"><div className="min-w-[760px]">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-2 mb-2 pl-8">
        <div className="col-span-3">Descrição</div>
        <div className="col-span-2 text-center">Categoria</div>
        <div className="col-span-2 text-center">Fonte</div>
        <div className="col-span-2 text-center">Data</div>
        <div className="col-span-2 text-right pr-3">Valor</div>
        <div className="col-span-1"></div>
      </div>

      {/* Items list */}
      <div className="space-y-1 max-h-80 overflow-y-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={filtered ? undefined : handleDragEnd}>
          <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
            {visibleItems.map(item => (
              <SortableItem key={item.id} id={item.id}>
                <div className="grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-lg hover:bg-muted/50 group">
                  <div className="col-span-3">
                    {editingId === item.id && editingField === 'description' ? (
                      <Input
                        value={item.description}
                        onChange={e => onUpdate(item.id, { description: e.target.value })}
                        onBlur={stopEditing}
                        onKeyDown={e => e.key === 'Enter' && stopEditing()}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    ) : editingId === item.id && editingField === 'note' ? (
                      <Input
                        value={item.note || ''}
                        onChange={e => onUpdate(item.id, { note: e.target.value })}
                        onBlur={stopEditing}
                        onKeyDown={e => e.key === 'Enter' && stopEditing()}
                        placeholder="Observação"
                        className="h-7 text-xs"
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="text-sm cursor-pointer hover:text-primary"
                        onClick={() => startEditing(item.id, 'description')}
                      >
                        <span className="truncate block font-medium">{item.description}</span>
                        {item.note ? (
                          <span 
                            className="text-xs text-muted-foreground cursor-pointer hover:underline"
                            onClick={(e) => { e.stopPropagation(); startEditing(item.id, 'note'); }}
                          >
                            {item.note}
                          </span>
                        ) : (
                          <span 
                            className="text-xs text-muted-foreground/50 cursor-pointer hover:underline opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={(e) => { e.stopPropagation(); startEditing(item.id, 'note'); }}
                          >
                            + Obs
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 text-center">
                    <Select
                      value={item.category}
                      onValueChange={v => onUpdate(item.id, { category: v as DailyCategory })}
                    >
                      <SelectTrigger className="h-8 text-xs">
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
                  </div>
                  <div className="col-span-2 text-center">
                    <Select
                      value={item.source}
                      onValueChange={v => onUpdate(item.id, { source: v as PaymentSource })}
                    >
                      <SelectTrigger className="h-8 text-xs">
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
                  </div>
                  <div className="col-span-2 text-center">
                    <Input
                      type="date"
                      value={item.date}
                      onChange={e => onUpdate(item.id, { date: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-2">
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
      </div>

      </div></div>
      {items.length === 0 && !isAdding && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Nenhuma despesa diária registrada. Clique em + para adicionar.
        </div>
      )}

      {/* Total */}
      {items.length > 0 && (
        <div className="flex items-center justify-between py-3 px-2 border-t border-border mt-3 font-medium ml-6">
          <span className="text-sm">Total Despesas Diárias</span>
          <span className="text-sm">{formatCurrency(totalActual)}</span>
        </div>
      )}
    </div>
  );
}