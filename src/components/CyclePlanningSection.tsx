import { useState } from 'react';
import { toast } from 'sonner';
import { Wallet, PiggyBank, Target, Plus, Trash2, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency } from '@/lib/format';
import {
  BUDGET_GROUPS,
  budgetGroupLabels,
  addExtraIncome,
  updateExtraIncome,
  removeExtraIncome,
  setPlannedSalary,
  setReceivedSalary,
  setInvestmentBaseGoal,
  setDistributionPercent,
} from '@/lib/cyclePlanning';
import { useCyclePlanning } from '@/hooks/useCyclePlanning';

const distributionSegmentColors = {
  carro: 'bg-category-transport',
  casa: 'bg-warning',
  fixos: 'bg-category-entertainment',
  parcelados: 'bg-category-shopping',
  diarias: 'bg-destructive',
} as const;

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

  const totalPercent = BUDGET_GROUPS.reduce((sum, group) => sum + planning.distribution[group], 0) + derived.subgoals.diarias.percent;

  return (
    <section className="space-y-4" aria-label="Planejamento do ciclo">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Card: Renda do ciclo */}
        <div className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Renda do ciclo</h3>
              <p className="text-xs text-muted-foreground">Salário e entradas extras</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor={`planned-salary-${cycleId}`}>Salário planejado</label>
                <CurrencyInput
                  id={`planned-salary-${cycleId}`}
                  value={planning.plannedSalary}
                  onChange={value => mutate(plan => setPlannedSalary(plan, value))}
                  className="mt-1.5 h-11 text-sm"
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor={`received-salary-${cycleId}`}>Salário recebido</label>
                <CurrencyInput
                  id={`received-salary-${cycleId}`}
                  value={planning.receivedSalary}
                  onChange={value => mutate(plan => setReceivedSalary(plan, value))}
                  className="mt-1.5 h-11 text-sm"
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Rendas extras</span>
                <Button size="sm" variant="outline" aria-label="Adicionar renda extra" onClick={() => setIsAdding(true)} disabled={readOnly}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-1">
                {planning.extraIncomes.map(item => (
                  <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2 py-1.5">
                    <div className="min-w-0">
                      {editingId === item.id ? (
                        <Input
                          aria-label="Descrição da renda extra"
                          value={draft}
                          onChange={e => setDraft(e.target.value)}
                          onBlur={() => {
                            if (editingId !== item.id) return;
                            setEditingId(null);
                            if (draft.trim() === item.description) return;
                            if (!draft.trim()) {
                              toast.error('A descrição não pode ficar vazia. O valor anterior foi mantido.');
                              return;
                            }
                            mutate(plan => updateExtraIncome(plan, item.id, { description: draft }));
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="h-11 text-sm"
                          autoFocus
                        />
                      ) : (
                        <Button
                          variant="ghost"
                          className="h-auto min-h-11 w-full justify-start whitespace-normal break-words px-2 text-left text-sm"
                          disabled={readOnly}
                          title="Editar descrição da renda extra"
                          onClick={() => {
                            if (readOnly) return;
                            setDraft(item.description);
                            setEditingId(item.id);
                          }}
                        >
                          {item.description}
                        </Button>
                      )}
                    </div>
                    <div className="min-w-0">
                      <CurrencyInput
                        aria-label={`Valor de ${item.description}`}
                        value={item.amount}
                        onChange={value => mutate(plan => updateExtraIncome(plan, item.id, { amount: value }))}
                        className="h-11 text-sm"
                        disabled={readOnly}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remover ${item.description}`}
                        className="h-11 w-11"
                        onClick={() => mutate(plan => removeExtraIncome(plan, item.id))}
                        disabled={readOnly}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {isAdding && (
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2 py-1.5">
                    <div className="min-w-0">
                      <Input
                        aria-label="Descrição da nova renda extra"
                        placeholder="Descrição"
                        value={newItem.description}
                        onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                        className="h-11 text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="min-w-0">
                      <CurrencyInput
                        aria-label="Valor da nova renda extra"
                        value={newItem.amount}
                        onChange={value => setNewItem({ ...newItem, amount: value })}
                        className="h-11 text-sm"
                      />
                    </div>
                    <div className="min-w-0">
                      <Button size="icon" variant="ghost" aria-label="Confirmar renda extra" className="h-11 w-11" onClick={handleAdd}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {planning.extraIncomes.length === 0 && !isAdding && (
                  <p className="py-2 text-xs text-muted-foreground">Nenhuma renda extra neste ciclo.</p>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2.5">
                <span className="text-xs font-medium text-muted-foreground">Total de rendas extras</span>
                <span className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(derived.extraIncomeTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Meta de investimento */}
        <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-card">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-investment/10">
                <PiggyBank className="h-4 w-4 text-investment" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Meta de investimento</h3>
                <p className="text-xs text-muted-foreground">Reserva protegida antes dos gastos</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor={`base-goal-${cycleId}`}>Meta-base</label>
                <CurrencyInput
                  id={`base-goal-${cycleId}`}
                  value={planning.investmentBaseGoal}
                  onChange={value => mutate(plan => setInvestmentBaseGoal(plan, value))}
                  className="mt-1.5 h-11 text-sm"
                  disabled={readOnly}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3.5 py-2.5">
                <span className="text-xs text-muted-foreground">Acréscimo (rendas extras)</span>
                <span className="text-sm font-semibold tabular-nums">{formatCurrency(derived.investmentIncrement)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-investment/20 bg-investment/10 px-4 py-3">
            <span className="text-xs font-semibold text-investment">Meta total de investimento</span>
            <span className="text-lg font-bold tabular-nums text-investment">{formatCurrency(derived.totalInvestmentGoal)}</span>
          </div>
        </div>
      </div>

      {/* Card: Distribuição do orçamento com barra segmentada */}
      <div className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Distribuição do orçamento</h3>
              <p className="text-xs text-muted-foreground">
                Meta principal de despesas: <strong className="text-foreground tabular-nums">{formatCurrency(derived.mainExpenseGoal)}</strong>
              </p>
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary tabular-nums">
            {totalPercent}% alocado
          </span>
        </div>

        {/* Barra Visual Segmentada */}
        <div className="mb-5 space-y-2">
          <div className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full bg-secondary" role="img" aria-label="Distribuição percentual do orçamento por grupo">
            {(['carro', 'casa', 'fixos', 'parcelados', 'diarias'] as const).map(group => {
              const pct = derived.subgoals[group].percent;
              if (pct <= 0) return null;
              return (
                <div
                  key={group}
                  title={`${budgetGroupLabels[group]}: ${pct}%`}
                  className={`h-full transition-all ${distributionSegmentColors[group]}`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {(['carro', 'casa', 'fixos', 'parcelados', 'diarias'] as const).map(group => (
              <span key={group} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${distributionSegmentColors[group]}`} />
                {budgetGroupLabels[group]} ({derived.subgoals[group].percent}%)
              </span>
            ))}
          </div>
        </div>

        <div className="max-w-3xl space-y-2.5">
          <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] gap-3 border-b border-border pb-2 text-xs font-medium text-muted-foreground">
            <span>Grupo</span>
            <span className="text-right">Percentual</span>
            <span className="text-right">Meta do ciclo</span>
          </div>
          {BUDGET_GROUPS.map(group => (
            <div key={group} className="grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] items-center gap-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className={`h-2 w-2 rounded-full ${distributionSegmentColors[group]}`} />
                {budgetGroupLabels[group]}
              </span>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={planning.distribution[group]}
                  onChange={e => mutate(plan => setDistributionPercent(plan, group, parseFloat(e.target.value) || 0))}
                  className="h-11 pr-6 text-right text-sm"
                  aria-label={`Percentual de ${budgetGroupLabels[group]}`}
                  disabled={readOnly}
                />
                <Percent className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              </div>
              <span className="break-words text-right text-sm font-semibold tabular-nums">
                {formatCurrency(derived.subgoals[group].amount)}
              </span>
            </div>
          ))}
          <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className={`h-2 w-2 rounded-full ${distributionSegmentColors.diarias}`} />
              {budgetGroupLabels.diarias}
            </span>
            <span className="text-right text-sm font-medium text-muted-foreground tabular-nums">
              {derived.subgoals.diarias.percent}%
            </span>
            <span className="break-words text-right text-sm font-bold tabular-nums">
              {formatCurrency(derived.subgoals.diarias.amount)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
