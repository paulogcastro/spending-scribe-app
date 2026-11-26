import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Wallet, PiggyBank, Target, Plus, Trash2, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency } from '@/lib/format';
import {
  addExtraIncome,
  updateExtraIncome,
  removeExtraIncome,
  setPlannedSalary,
  setReceivedSalary,
  setInvestmentBaseGoal,
  setInvestedAmount,
  setDistributionPercent,
  setDistributionAmount,
  computeSubgoals,
} from '@/lib/cyclePlanning';
import type { BudgetGroupRecord } from '@/lib/expenseDomain';
import { getGroupColorStyles } from '@/components/budgetGroupStyles';
import { useCyclePlanning } from '@/hooks/useCyclePlanning';

function PercentInput({
  value,
  disabled,
  ariaLabel,
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  ariaLabel: string;
  onCommit: (next: number) => void;
}) {
  const [text, setText] = useState(() => String(value).replace('.', ','));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value).replace('.', ','));
  }, [value, focused]);

  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="decimal"
        value={text}
        disabled={disabled}
        aria-label={ariaLabel}
        className="h-11 pr-7 text-right text-sm tabular-nums"
        onFocus={e => {
          setFocused(true);
          e.currentTarget.select();
        }}
        onChange={e => {
          const raw = e.target.value;
          setText(raw);
          const normalized = raw.replace(',', '.').trim();
          if (normalized === '') return;
          const parsed = Number(normalized);
          if (Number.isFinite(parsed)) onCommit(parsed);
        }}
        onBlur={() => {
          setFocused(false);
          const normalized = text.replace(',', '.').trim();
          if (normalized === '') {
            onCommit(0);
            setText('0');
            return;
          }
          const parsed = Number(normalized);
          if (Number.isFinite(parsed)) {
            onCommit(parsed);
          } else {
            setText(String(value).replace('.', ','));
          }
        }}
      />
      <Percent className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function CyclePlanningSection({
  cycleId,
  cyclePlanning,
  budgetGroups,
  availableToInvest = 0,
  totalDays = 30,
}: {
  cycleId: string;
  cyclePlanning: ReturnType<typeof useCyclePlanning>;
  budgetGroups: BudgetGroupRecord[];
  availableToInvest?: number;
  totalDays?: number;
}) {
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

  const editableGroups = budgetGroups.filter(g => !g.isResidual && g.id !== 'diarias');
  const residualGroup = budgetGroups.find(g => g.isResidual || g.id === 'diarias');
  const subgoals = computeSubgoals(planning, editableGroups.map(g => g.id));
  const totalPercent = editableGroups.reduce((sum, group) => sum + (planning.distribution[group.id] ?? 0), 0) + (subgoals.diarias?.percent ?? 0);

  const invGoal = derived.totalInvestmentGoal;
  const invested = derived.investedAmount;
  const invDiff = derived.investmentDiff;
  const invPct = derived.investmentAchievementPercent;
  const invDiffPct = invPct - 100;

  const incomeInvestPct = planning.plannedSalary > 0 ? Math.round((invGoal / planning.plannedSalary) * 100) : 0;
  const incomeExpensePct = planning.plannedSalary > 0 ? Math.max(0, 100 - incomeInvestPct) : 0;
  const dailyAvg = totalDays > 0 ? (subgoals.diarias?.amount ?? 0) / totalDays : 0;

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
              <p className="text-xs text-muted-foreground">Planejado define os limites · Recebido calcula o saldo em caixa</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor={`planned-salary-${cycleId}`}>
                    Salário planejado
                  </label>
                </div>
                <CurrencyInput
                  id={`planned-salary-${cycleId}`}
                  value={planning.plannedSalary}
                  onChange={value => mutate(plan => setPlannedSalary(plan, value))}
                  className="mt-1.5 h-11 text-sm"
                  disabled={readOnly}
                />
              </div>
              <div>
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor={`received-salary-${cycleId}`}>
                    Salário recebido
                  </label>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => mutate(plan => setReceivedSalary(plan, plan.plannedSalary))}
                    className="whitespace-nowrap text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                  >
                    Igual ao planejado
                  </button>
                </div>
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

        {/* Card: Meta de investimento vs Realizado */}
        <div className="flex min-w-0 flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-investment/10">
                  <PiggyBank className="h-4 w-4 text-investment" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Meta de investimento</h3>
                  <p className="text-xs text-muted-foreground">Planejado vs. investido de fato no ciclo</p>
                </div>
              </div>
              {invGoal > 0 && (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                    invDiff > 0
                      ? 'bg-success/10 text-success'
                      : invDiff === 0
                        ? 'bg-investment/15 text-investment'
                        : 'bg-warning/15 text-warning'
                  }`}
                >
                  {invDiff > 0
                    ? `+${invDiffPct}% acima da meta`
                    : invDiff === 0
                      ? 'Meta atingida'
                      : `${invDiffPct}% abaixo da meta`}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor={`base-goal-${cycleId}`}>
                    Meta de investimento
                  </label>
                </div>
                <CurrencyInput
                  id={`base-goal-${cycleId}`}
                  value={planning.investmentBaseGoal}
                  onChange={value => mutate(plan => setInvestmentBaseGoal(plan, value))}
                  className="mt-1.5 h-11 text-sm"
                  disabled={readOnly}
                />
              </div>
              <div>
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor={`invested-amount-${cycleId}`}>
                    Investido no ciclo
                  </label>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => mutate(plan => setInvestedAmount(plan, plan.investmentBaseGoal))}
                    className="whitespace-nowrap text-xs font-semibold text-investment hover:underline disabled:opacity-50"
                  >
                    Igual à meta
                  </button>
                </div>
                <CurrencyInput
                  id={`invested-amount-${cycleId}`}
                  value={invested}
                  onChange={value => mutate(plan => setInvestedAmount(plan, value))}
                  className="mt-1.5 h-11 text-sm"
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="rounded-xl bg-secondary/50 px-3.5 py-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">Disponível para investir (após gastos)</span>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    availableToInvest >= invGoal
                      ? 'text-success'
                      : availableToInvest >= 0
                        ? 'text-warning'
                        : 'text-destructive'
                  }`}
                >
                  {formatCurrency(availableToInvest)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Atingimento da meta</span>
              <span className="font-bold tabular-nums">{invGoal > 0 ? `${invPct}% da meta` : 'Sem meta'}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all ${
                  invDiff > 0 ? 'bg-success' : invDiff === 0 ? 'bg-investment' : 'bg-warning'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, invPct))}%` }}
              />
            </div>
            <p
              className={`text-xs font-medium tabular-nums ${
                invGoal <= 0
                  ? 'text-muted-foreground'
                  : invDiff > 0
                    ? 'text-success'
                    : invDiff === 0
                      ? 'text-investment'
                      : 'text-warning'
              }`}
            >
              {invGoal <= 0
                ? 'Defina uma meta para acompanhar o atingimento.'
                : invDiff > 0
                  ? `Investimento extra: ${formatCurrency(invDiff)} acima da meta!`
                  : invDiff === 0
                    ? 'Meta exata de investimento atingida.'
                    : `Faltam ${formatCurrency(Math.abs(invDiff))} para atingir a meta.`}
            </p>
          </div>
        </div>
      </div>

      {/* Card: Distribuição do orçamento com barra segmentada + Resumo do fluxo da renda */}
      <div className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Distribuição do orçamento</h3>
              <p className="text-xs text-muted-foreground">
                Limite principal de despesas: <strong className="text-foreground tabular-nums">{formatCurrency(derived.mainExpenseGoal)}</strong>
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
            {budgetGroups.map(group => {
              const pct = subgoals[group.id]?.percent ?? 0;
              if (pct <= 0) return null;
              const styles = getGroupColorStyles(group.color);
              return (
                <div
                  key={group.id}
                  title={`${group.name}: ${pct}%`}
                  className={`h-full transition-all ${styles.barClass}`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {budgetGroups.map(group => {
              const styles = getGroupColorStyles(group.color);
              return (
                <span key={group.id} className="inline-flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${styles.dotClass}`} />
                  {group.name} ({subgoals[group.id]?.percent ?? 0}%)
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* Esquerda: Tabela de % e R$ */}
          <div className="space-y-3">
            <div className="hidden gap-3 border-b border-border pb-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1.2fr)_7.5rem_9.5rem]">
              <span>Grupo</span>
              <span className="text-right">Percentual (%)</span>
              <span className="text-right">Limite no ciclo (R$)</span>
            </div>
            {editableGroups.map(group => {
              const styles = getGroupColorStyles(group.color);
              const pct = planning.distribution[group.id] ?? 0;
              const amt = subgoals[group.id]?.amount ?? 0;
              return (
                <div
                  key={group.id}
                  className="grid grid-cols-1 items-center gap-2 rounded-xl border border-border p-3 sm:grid-cols-[minmax(0,1.2fr)_7.5rem_9.5rem] sm:gap-3 sm:rounded-none sm:border-0 sm:p-0"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className={`h-2 w-2 rounded-full ${styles.dotClass}`} />
                    {group.name}
                  </span>
                  <div>
                    <span className="mb-1 block text-xs text-muted-foreground sm:hidden">Percentual (%)</span>
                    <PercentInput
                      value={pct}
                      disabled={readOnly}
                      ariaLabel={`Percentual de ${group.name}`}
                      onCommit={val => mutate(plan => setDistributionPercent(plan, group.id, val))}
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-xs text-muted-foreground sm:hidden">Limite no ciclo (R$)</span>
                    <CurrencyInput
                      aria-label={`Limite em reais de ${group.name}`}
                      value={amt}
                      onChange={amount => mutate(plan => setDistributionAmount(plan, group.id, amount))}
                      className="h-11 text-sm"
                      disabled={readOnly}
                    />
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-1 items-center gap-2 border-t border-border pt-3 sm:grid-cols-[minmax(0,1.2fr)_7.5rem_9.5rem] sm:gap-3">
              <div className="flex items-center justify-between gap-2 sm:justify-start">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  {residualGroup?.name ?? 'Gastos diários'}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  Residual automático
                </span>
              </div>
              <div className="flex items-center justify-between text-sm font-medium text-muted-foreground tabular-nums sm:justify-end">
                <span className="text-xs sm:hidden">Percentual:</span>
                <span>{subgoals.diarias?.percent ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold tabular-nums sm:justify-end">
                <span className="text-xs font-normal text-muted-foreground sm:hidden">Limite no ciclo:</span>
                <span>{formatCurrency(subgoals.diarias?.amount ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Direita: Resumo do fluxo da renda */}
          <aside className="space-y-4 rounded-2xl border border-border bg-secondary/40 p-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resumo do fluxo da renda</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">Como sua renda planejada é dividida</p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Salário planejado</span>
                <span className="font-semibold tabular-nums">{formatCurrency(planning.plannedSalary)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">(-) Reserva de investimento</span>
                <span className="font-semibold text-investment tabular-nums">- {formatCurrency(invGoal)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
                <span className="font-semibold text-foreground">(=) Limite de despesas</span>
                <span className="text-sm font-bold tabular-nums">{formatCurrency(derived.mainExpenseGoal)}</span>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-border pt-3">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-investment tabular-nums">{incomeInvestPct}% investimento</span>
                <span className="text-muted-foreground tabular-nums">{incomeExpensePct}% despesas</span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-border">
                <div className="h-full bg-investment transition-all" style={{ width: `${incomeInvestPct}%` }} />
                <div className="h-full bg-primary transition-all" style={{ width: `${incomeExpensePct}%` }} />
              </div>
            </div>

            <div className="space-y-1 rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Média prevista em Gastos diários ({totalDays} dias)</p>
              <p className="text-base font-bold tabular-nums">
                {formatCurrency(dailyAvg)} <span className="text-xs font-normal text-muted-foreground">/ dia</span>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
