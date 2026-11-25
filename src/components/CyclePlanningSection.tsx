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
    <section className="space-y-6 bg-card -mx-6 px-6 py-5" aria-label="Planejamento do ciclo">
      <h2 className="text-lg font-semibold">Planejamento do ciclo</h2>
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
        {/* Renda do ciclo */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold">Renda do ciclo</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" htmlFor={`planned-salary-${cycleId}`}>Salário planejado</label>
              <CurrencyInput id={`planned-salary-${cycleId}`} value={planning.plannedSalary} onChange={value => mutate(plan => setPlannedSalary(plan, value))} className="h-11 text-sm mt-2" disabled={readOnly} />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor={`received-salary-${cycleId}`}>Salário recebido</label>
              <CurrencyInput id={`received-salary-${cycleId}`} value={planning.receivedSalary} onChange={value => mutate(plan => setReceivedSalary(plan, value))} className="h-11 text-sm mt-2" disabled={readOnly} />
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
                  <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 items-center py-2 group">
                    <div className="min-w-0">
                      {editingId === item.id ? (
                        <Input aria-label="Descrição da renda extra" value={draft} onChange={e => setDraft(e.target.value)}
                          onBlur={() => { if (editingId !== item.id) return; setEditingId(null); if (draft.trim() === item.description) return; if (!draft.trim()) { toast.error('A descrição não pode ficar vazia. O valor anterior foi mantido.'); return; } mutate(plan => updateExtraIncome(plan, item.id, { description: draft })); }}
                          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setEditingId(null); } }} className="h-11 text-sm" autoFocus />
                      ) : (
                        <Button variant="ghost" className="h-auto min-h-11 w-full justify-start whitespace-normal break-words px-0 text-left text-sm" disabled={readOnly} title="Editar descrição da renda extra" onClick={() => { if (readOnly) return; setDraft(item.description); setEditingId(item.id); }}>{item.description}</Button>
                      )}
                    </div>
                    <div className="min-w-0">
                      <CurrencyInput aria-label={`Valor de ${item.description}`} value={item.amount} onChange={value => mutate(plan => updateExtraIncome(plan, item.id, { amount: value }))} className="h-11 text-sm" disabled={readOnly} />
                    </div>
                    <div className="flex justify-end">
                      <Button size="icon" variant="ghost" aria-label={`Remover ${item.description}`} className="h-11 w-11" onClick={() => mutate(plan => removeExtraIncome(plan, item.id))} disabled={readOnly}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {isAdding && (
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 items-center py-2">
                    <div className="min-w-0">
                      <Input aria-label="Descrição da nova renda extra" placeholder="Descrição" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} className="h-11 text-sm" autoFocus />
                    </div>
                    <div className="min-w-0">
                      <CurrencyInput aria-label="Valor da nova renda extra" value={newItem.amount} onChange={value => setNewItem({ ...newItem, amount: value })} className="h-11 text-sm" />
                    </div>
                    <div className="min-w-0">
                      <Button size="icon" variant="ghost" aria-label="Confirmar renda extra" className="h-11 w-11" onClick={handleAdd}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {planning.extraIncomes.length === 0 && !isAdding && (
                  <p className="text-xs text-muted-foreground py-1">Nenhuma renda extra neste ciclo.</p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-border mt-2 pt-2">
                <span className="text-xs font-medium">Total de rendas extras</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(derived.extraIncomeTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Meta de investimento */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-investment/10">
              <PiggyBank className="h-4 w-4 text-investment" />
            </div>
            <h3 className="font-semibold">Meta de investimento</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" htmlFor={`base-goal-${cycleId}`}>Meta-base</label>
              <CurrencyInput id={`base-goal-${cycleId}`} value={planning.investmentBaseGoal} onChange={value => mutate(plan => setInvestmentBaseGoal(plan, value))} className="h-11 text-sm mt-2" disabled={readOnly} />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">Acréscimo (rendas extras)</span>
              <span className="text-sm font-medium tabular-nums">{formatCurrency(derived.investmentIncrement)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Meta total de investimento</span>
              <span className="text-sm font-semibold text-investment tabular-nums">{formatCurrency(derived.totalInvestmentGoal)}</span>
            </div>
          </div>
        </div>

        {/* Orçamento de despesas */}
        <div className="min-w-0 border-t border-border pt-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold">Distribuição do orçamento</h3>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">Meta principal de despesas</span>
            <span className="text-sm font-semibold tabular-nums">{formatCurrency(derived.mainExpenseGoal)}</span>
          </div>
          <div className="space-y-2 max-w-3xl">
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] gap-3 border-b border-border pb-2 text-xs text-muted-foreground"><span>Grupo</span><span className="text-right">Percentual</span><span className="text-right">Meta do ciclo</span></div>
            {BUDGET_GROUPS.map(group => (
              <div key={group} className="grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] gap-3 items-center">
                <span className="text-sm">{budgetGroupLabels[group]}</span>
                <div className="relative">
                  <Input type="number" min={0} max={100} step={1} value={planning.distribution[group]} onChange={e => mutate(plan => setDistributionPercent(plan, group, parseFloat(e.target.value) || 0))} className="h-11 text-sm pr-6 text-right" aria-label={`Percentual de ${budgetGroupLabels[group]}`} disabled={readOnly} />
                  <Percent className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                </div>
                <span className="break-words text-sm font-medium text-right tabular-nums">{formatCurrency(derived.subgoals[group].amount)}</span>
              </div>
            ))}
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] gap-3 items-center border-t border-border pt-2">
              <span className="text-sm font-medium">{budgetGroupLabels.diarias}</span>
              <span className="text-sm text-muted-foreground text-right tabular-nums">{derived.subgoals.diarias.percent}%</span>
              <span className="break-words text-sm font-medium text-right tabular-nums">{formatCurrency(derived.subgoals.diarias.amount)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
