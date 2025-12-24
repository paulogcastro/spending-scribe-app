import { useState } from 'react';
import { InstallmentItem, calculateInstallmentValue, getInstallmentLabel } from '@/types/finance';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, CreditCard } from 'lucide-react';

interface InstallmentSectionProps {
  items: InstallmentItem[];
  onAdd: (item: Omit<InstallmentItem, 'id' | 'currentInstallment' | 'startDate'>) => void;
  onUpdate: (id: string, updates: Partial<InstallmentItem>) => void;
  onRemove: (id: string) => void;
}

export function InstallmentSection({ items, onAdd, onUpdate, onRemove }: InstallmentSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ 
    description: '', 
    totalValue: '', 
    installments: '', 
    note: '' 
  });

  const totalMonthly = items.reduce((sum, item) => sum + calculateInstallmentValue(item), 0);

  const handleAdd = () => {
    if (!newItem.description || !newItem.totalValue || !newItem.installments) return;
    onAdd({
      description: newItem.description,
      totalValue: parseFloat(newItem.totalValue) || 0,
      installments: parseInt(newItem.installments) || 1,
      note: newItem.note || undefined,
    });
    setNewItem({ description: '', totalValue: '', installments: '', note: '' });
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
          <div className="col-span-5">Descrição</div>
          <div className="col-span-2 text-right">Total</div>
          <div className="col-span-2 text-center">Parcelas</div>
          <div className="col-span-2 text-right">Mensal</div>
          <div className="col-span-1"></div>
        </div>

        {/* Items */}
        {items.map((item) => {
          const monthlyValue = calculateInstallmentValue(item);
          const label = getInstallmentLabel(item);
          
          return (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-lg hover:bg-muted/50 group">
              <div className="col-span-5 text-sm">
                <span>{item.description}</span>
                {item.note && <span className="text-xs text-muted-foreground ml-1">{item.note}</span>}
              </div>
              <div className="col-span-2 text-right text-sm text-muted-foreground">
                {formatCurrency(item.totalValue)}
              </div>
              <div className="col-span-2 text-center text-sm">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-600">
                  {label}
                </span>
              </div>
              <div className="col-span-2 text-right text-sm font-medium">
                {formatCurrency(monthlyValue)}
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
          );
        })}

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
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                placeholder="Valor total"
                value={newItem.totalValue}
                onChange={(e) => setNewItem({ ...newItem, totalValue: e.target.value })}
                className="h-9"
              />
              <Input
                type="number"
                placeholder="Nº parcelas"
                value={newItem.installments}
                onChange={(e) => setNewItem({ ...newItem, installments: e.target.value })}
                className="h-9"
              />
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleAdd}>
                  Salvar
                </Button>
              </div>
            </div>
            {newItem.totalValue && newItem.installments && (
              <div className="text-sm text-muted-foreground text-center">
                Parcela mensal: {formatCurrency(parseFloat(newItem.totalValue) / parseInt(newItem.installments))}
              </div>
            )}
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
            <div className="col-span-9 text-sm">Total Parcelados (mensal)</div>
            <div className="col-span-2 text-right text-sm text-purple-600">{formatCurrency(totalMonthly)}</div>
            <div className="col-span-1"></div>
          </div>
        )}
      </div>
    </div>
  );
}
