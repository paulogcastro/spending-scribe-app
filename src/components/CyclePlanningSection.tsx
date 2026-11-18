import { useState } from 'react';
import { toast } from 'sonner';
import { Wallet, PiggyBank, Target, Plus, Trash2, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency } from '@/lib/format';
import { BUDGET_GROUPS, budgetGroupLabels, addExtraIncome, updateExtraIncome, removeExtraIncome, setPlannedSalary, setReceivedSalary, setInvestmentBaseGoal, setDistributionPercent } from '@/lib/cyclePlanning';
import { useCyclePlanning } from '@/hooks/useCyclePlanning';

export function CyclePlanningSection({ cycleId, cyclePlanning }: { cycleId: string; cyclePlanning: ReturnType<typeof useCyclePlanning> }) {
  const { planning, derived, mutate, readOnly } = cyclePlanning;
  const [draft, setDraft] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ description: '', amount: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newItem.description.trim()) return;
    mutate(plan => addExtraIncome(plan, newItem));
    setNewItem({ description: '', amount: 0 });
    setIsAdding(false);
  };

  return (
    <section className="space-y-4" aria-label="Planejamento do ciclo">
      <h3 className="text-sm font-medium text-muted-foreground">Planejamento do ciclo</h3>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Renda do ciclo */}
        <div className="border border-border p-5 shadow-card bg-card rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold">Renda do ciclo</h4>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground" htmlFor={`planned-salary-${cycleId}`}>Salário planejado</label>
              <CurrencyInput id={`planned-salary-${cycleId}`} value={planning.plannedSalary} onChange={value => mutate(plan => setPlannedSalary(plan, value))} className="h-8 text-sm mt-1" disabled={readOnly} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground" htmlFor={`received-salary-${cycleId}`}>Salário recebido</label>
              <CurrencyInput id={`received-salary-${cycleId}`} value={planning.receivedSalary} onChange={value => mutate(plan => setReceivedSalary(plan, value))} className="h-8 text-sm mt-1" disabled={readOnly} />
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Rendas extras</span>
                <Button size="sm" variant="outline" aria-label="Adicionar renda extra" onClick={() => setIsAdding(true)} disabled={readOnly}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {planning.extraIncomes.map(item => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center py-1 px-1 rounded-lg hover:bg-muted/50 group">
                    <div className="col-span-6">
                      {editingId === item.id ? (
                        <Input aria-label="Descrição da renda extra" value={draft} onChange={e => setDraft(e.target.value)}
                          onBlur={() => { if (editingId !== item.id) return; setEditingId(null); if (draft.trim() === item.description) return; if (!draft.trim()) { toast.error('A descrição não pode ficar vazia. O valor anterior foi mantido.'); return; } mutate(plan => updateExtraIncome(plan, item.id, { description: draft })); }}
                          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setEditingId(null); } }} className="h-7 text-xs" autoFocus />
                      ) : (
                        <div className="text-xs cursor-pointer hover:text-primary" onClick={() => { if (readOnly) return; setDraft(item.description); setEditingId(item.id); }}>{item.description}</div>
                      )}
                    </div>
                    <div className="col-span-5">
                      <CurrencyInput value={item.amount} onChange={value => mutate(plan => updateExtraIncome(plan, item.id, { amount: value }))} className="h-7 text-xs" disabled={readOnly} />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button size="icon" variant="ghost" aria-label={`Remover ${item.description}`} className="h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100" onClick={() => mutate(plan => removeExtraIncome(plan, item.id))} disabled={readOnly}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {isAdding && (
                  <div className="grid grid-cols-12 gap-2 items-center py-1 px-1 bg-muted/30 rounded-lg">
                    <div className="col-span-6">
                      <Input placeholder="Descrição" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} className="h-7 text-xs" autoFocus />
                    </div>
                    <div className="col-span-5">
                      <CurrencyInput value={newItem.amount} onChange={value => setNewItem({ ...newItem, amount: value })} className="h-7 text-xs" />
                    </div>
                    <div className="col-span-1">
                      <Button size="icon" variant="ghost" aria-label="Confirmar renda extra" className="h-6 w-6" onClick={handleAdd}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {planning.extraIncomes.length === 0 && !isAdding && (
                  <p className="text-xs text-muted-foreground py-1">Nenhuma renda extra. Clique em + para adicionar.</p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-border mt-2 pt-2">
                <span className="text-xs font-medium">Total de rendas extras</span>
                <span className="text-xs font-medium text-primary tabular-nums">{formatCurrency(derived.extraIncomeTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Meta de investimento */}
        <div className="border border-border p-5 shadow-card bg-card rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-category-entertainment/10">
              <PiggyBank className="h-4 w-4 text-category-entertainment" />
            </div>
            <h4 className="font-semibold">Meta de investimento</h4>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground" htmlFor={`base-goal-${cycleId}`}>Meta-base</label>
              <CurrencyInput id={`base-goal-${cycleId}`} value={planning.investmentBaseGoal} onChange={value => mutate(plan => setInvestmentBaseGoal(plan, value))} className="h-8 text-sm mt-1" disabled={readOnly} />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">Acréscimo (rendas extras)</span>
              <span className="text-sm font-medium tabular-nums">{formatCurrency(derived.investmentIncrement)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Meta total de investimento</span>
              <span className="text-sm font-semibold text-category-entertainment tabular-nums">{formatCurrency(derived.totalInvestmentGoal)}</span>
            </div>
          </div>
        </div>

        {/* Orçamento de despesas */}
        <div className="border border-border p-5 shadow-card bg-card rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold">Orçamento de despesas</h4>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">Meta principal de despesas</span>
            <span className="text-sm font-semibold tabular-nums">{formatCurrency(derived.mainExpenseGoal)}</span>
          </div>
          <div className="space-y-2">
            {BUDGET_GROUPS.map(group => (
              <div key={group} className="grid grid-cols-12 gap-2 items-center">
                <span className="col-span-5 text-xs">{budgetGroupLabels[group]}</span>
                <div className="col-span-3 relative">
                  <Input type="number" min={0} max={100} step={1} value={planning.distribution[group]} onChange={e => mutate(plan => setDistributionPercent(plan, group, parseFloat(e.target.value) || 0))} className="h-7 text-xs pr-5 text-right" aria-label={`Percentual de ${budgetGroupLabels[group]}`} disabled={readOnly} />
                  <Percent className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                </div>
                <span className="col-span-4 text-xs font-medium text-right tabular-nums">{formatCurrency(derived.subgoals[group].amount)}</span>
              </div>
            ))}
            <div className="grid grid-cols-12 gap-2 items-center border-t border-border pt-2">
              <span className="col-span-5 text-xs font-medium">{budgetGroupLabels.diarias}</span>
              <span className="col-span-3 text-xs text-muted-foreground text-right tabular-nums">{derived.subgoals.diarias.percent}%</span>
              <span className="col-span-4 text-xs font-medium text-right tabular-nums">{formatCurrency(derived.subgoals.diarias.amount)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
