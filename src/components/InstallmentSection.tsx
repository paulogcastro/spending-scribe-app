import { useState } from 'react';
import { InstallmentItem, CardType, cardTypeLabels } from '@/types/finance';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, CreditCard } from 'lucide-react';

interface InstallmentSectionProps {
  items: InstallmentItem[];
  onAdd: (item: Omit<InstallmentItem, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<InstallmentItem>) => void;
  onRemove: (id: string) => void;
}

export function InstallmentSection({ items, onAdd, onUpdate, onRemove }: InstallmentSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ 
    description: '', 
    planned: '',
    actual: '',
    installments: '',
    card: 'cartao_inter' as CardType,
    isRecurring: false,
    note: '' 
  });

  const totalPlanned = items.reduce((sum, item) => sum + item.planned, 0);
  const totalActual = items.reduce((sum, item) => sum + item.actual, 0);

  const handleAdd = () => {
    if (!newItem.description) return;
    onAdd({
      description: newItem.description,
      planned: parseFloat(newItem.planned) || 0,
      actual: parseFloat(newItem.actual) || 0,
      installments: newItem.installments || undefined,
      card: newItem.card,
      isRecurring: newItem.isRecurring,
      note: newItem.note || undefined,
    });
    setNewItem({ description: '', planned: '', actual: '', installments: '', card: 'cartao_inter', isRecurring: false, note: '' });
    setIsAdding(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
            <CreditCard className="h-4 w-4 text-purple-500" />
          </div>
          <h3 className="font-semibold">Parcelados no Cartão</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-2">
          <div className="col-span-3">Descrição</div>
          <div className="col-span-1 text-center">Parcelas</div>
          <div className="col-span-2 text-right">Projetado</div>
          <div className="col-span-2 text-right">Atual</div>
          <div className="col-span-2 text-center">Cartão</div>
          <div className="col-span-1 text-center">Recor.</div>
          <div className="col-span-1"></div>
        </div>

        {/* Items */}
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-lg hover:bg-muted/50 group">
            <div className="col-span-3 text-sm">
              <span>{item.description}</span>
              {item.note && <span className="text-xs text-muted-foreground ml-1">{item.note}</span>}
            </div>
            <div className="col-span-1">
              <Input
                type="text"
                placeholder="1/12"
                value={item.installments || ''}
                onChange={(e) => onUpdate(item.id, { installments: e.target.value })}
                className="h-8 text-center text-xs"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                value={item.planned || ''}
                onChange={(e) => onUpdate(item.id, { planned: parseFloat(e.target.value) || 0 })}
                className="h-8 text-right text-sm"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                value={item.actual || ''}
                onChange={(e) => onUpdate(item.id, { actual: parseFloat(e.target.value) || 0 })}
                className="h-8 text-right text-sm"
              />
            </div>
            <div className="col-span-2 text-center text-sm">
              <Select 
                value={item.card} 
                onValueChange={(v) => onUpdate(item.id, { card: v as CardType })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(cardTypeLabels) as CardType[]).map((card) => (
                    <SelectItem key={card} value={card}>
                      {cardTypeLabels[card]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 flex justify-center">
              <Checkbox
                checked={item.isRecurring || false}
                onCheckedChange={(checked) => onUpdate(item.id, { isRecurring: checked as boolean })}
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
          <div className="space-y-3 py-3 px-2 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Descrição"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="h-9"
                autoFocus
              />
              <Input
                placeholder="Observação (opcional)"
                value={newItem.note}
                onChange={(e) => setNewItem({ ...newItem, note: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-5 gap-2 items-center">
              <Input
                type="text"
                placeholder="Parcelas (1/12)"
                value={newItem.installments}
                onChange={(e) => setNewItem({ ...newItem, installments: e.target.value })}
                className="h-9"
              />
              <Input
                type="number"
                placeholder="Projetado"
                value={newItem.planned}
                onChange={(e) => setNewItem({ ...newItem, planned: e.target.value })}
                className="h-9"
              />
              <Input
                type="number"
                placeholder="Atual"
                value={newItem.actual}
                onChange={(e) => setNewItem({ ...newItem, actual: e.target.value })}
                className="h-9"
              />
              <Select 
                value={newItem.card} 
                onValueChange={(v) => setNewItem({ ...newItem, card: v as CardType })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(cardTypeLabels) as CardType[]).map((card) => (
                    <SelectItem key={card} value={card}>
                      {cardTypeLabels[card]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={newItem.isRecurring}
                  onCheckedChange={(checked) => setNewItem({ ...newItem, isRecurring: checked as boolean })}
                />
                Recorrente
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsAdding(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAdd}>
                Salvar
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 && !isAdding && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Nenhum item parcelado. Clique em + para adicionar.
          </div>
        )}

        {/* Total */}
        {items.length > 0 && (
          <div className="grid grid-cols-12 gap-2 items-center py-2 px-2 border-t border-border mt-2 font-medium">
            <div className="col-span-4 text-sm">Total Parcelados</div>
            <div className="col-span-2 text-right text-sm">{formatCurrency(totalPlanned)}</div>
            <div className="col-span-2 text-right text-sm text-purple-600">{formatCurrency(totalActual)}</div>
            <div className="col-span-4"></div>
          </div>
        )}
      </div>
    </div>
  );
}
