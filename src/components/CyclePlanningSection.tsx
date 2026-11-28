import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Wallet,
  PiggyBank,
  Target,
  Plus,
  Trash2,
  Percent,
  Check,
  X,
  Save,
  AlertCircle,
} from 'lucide-react';
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
  computePlanning,
  computeSubgoals,
  roundMoney,
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
          if (Number.isFinite(parsed) && parsed >= 0) onCommit(parsed);
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
          if (Number.isFinite(parsed) && parsed >= 0) {
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

function CardSaveFooter({
  dirty,
  readOnly,
  errorMessage,
  saveLabel = 'Salvar',
  onSave,
  onCancel,
}: {
  dirty: boolean;
  readOnly: boolean;
  errorMessage?: string | null;
  saveLabel?: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3.5">
      <div className="flex min-w-0 items-center gap-1.5 text-xs">
        {errorMessage ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </span>
        ) : !dirty ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Check className="h-3.5 w-3.5 shrink-0 text-success" />
            Salvo
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {dirty && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={readOnly}
            onClick={onCancel}
            className="h-9"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant={dirty ? 'default' : 'outline'}
          disabled={readOnly || !dirty || Boolean(errorMessage)}
          onClick={onSave}
          className="h-9 gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          {saveLabel}
        </Button>
      </div>
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

  // Draft: Renda do ciclo
  const [salaryDraft, setSalaryDraft] = useState(planning.plannedSalary);
  const [extraAmountsDraft, setExtraAmountsDraft] = useState<Record<string, number>>(() =>
    Object.fromEntries(planning.extraIncomes.map(item => [item.id, item.amount]))
  );
  const [draftDescription, setDraftDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ description: '', amount: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Draft: Meta de investimento
  const [investmentBaseDraft, setInvestmentBaseDraft] = useState(planning.investmentBaseGoal);
  const [investedDraft, setInvestedDraft] = useState(derived.investedAmount);

  // Draft: Distribuição do orçamento
  const [distributionDraft, setDistributionDraft] = useState<Record<string, number>>(() => ({
    ...planning.distribution,
  }));

  useEffect(() => {
    setSalaryDraft(planning.plannedSalary);
    setExtraAmountsDraft(Object.fromEntries(planning.extraIncomes.map(item => [item.id, item.amount])));
  }, [planning.plannedSalary, planning.extraIncomes]);

  useEffect(() => {
    setInvestmentBaseDraft(planning.investmentBaseGoal);
    setInvestedDraft(derived.investedAmount);
  }, [planning.investmentBaseGoal, derived.investedAmount]);

  useEffect(() => {
    setDistributionDraft({ ...planning.distribution });
  }, [planning.distribution]);

  const editableGroups = useMemo(
    () => budgetGroups.filter(g => !g.isResidual && g.id !== 'diarias'),
    [budgetGroups]
  );
  const residualGroup = useMemo(
    () => budgetGroups.find(g => g.isResidual || g.id === 'diarias'),
    [budgetGroups]
  );

  // Dirty checks
  const hasPendingNewExtra = isAdding && newItem.description.trim().length > 0;
  const incomeDirty =
    salaryDraft !== planning.plannedSalary ||
    planning.extraIncomes.some(item => (extraAmountsDraft[item.id] ?? item.amount) !== item.amount) ||
    hasPendingNewExtra;

  const investmentDirty =
    investmentBaseDraft !== planning.investmentBaseGoal ||
    investedDraft !== derived.investedAmount;

  const distributionDirty = editableGroups.some(
    g => roundMoney(distributionDraft[g.id] ?? 0) !== roundMoney(planning.distribution[g.id] ?? 0)
  );

  // Live previews using pure functions
  const extraIncomePreviewTotal = roundMoney(
    planning.extraIncomes.reduce((sum, item) => sum + (extraAmountsDraft[item.id] ?? item.amount), 0) +
      (hasPendingNewExtra ? newItem.amount : 0)
  );

  const investmentPreview = useMemo(
    () =>
      computePlanning({
        ...planning,
        investmentBaseGoal: investmentBaseDraft,
        investedAmount: investedDraft,
      }),
    [planning, investmentBaseDraft, investedDraft]
  );

  const distributionPreviewPlan = useMemo(
    () => ({
      ...planning,
      distribution: { ...planning.distribution, ...distributionDraft },
    }),
    [planning, distributionDraft]
  );

  const editablePercentSum = roundMoney(
    editableGroups.reduce((sum, group) => sum + (distributionDraft[group.id] ?? 0), 0)
  );
  const distributionOver100 = editablePercentSum > 100.001;

  const subgoals = useMemo(
    () => computeSubgoals(distributionPreviewPlan, editableGroups.map(g => g.id)),
    [distributionPreviewPlan, editableGroups]
  );

  const totalPercent = roundMoney(
    editablePercentSum + Math.max(0, subgoals.diarias?.percent ?? 0)
  );

  const invGoal = investmentPreview.totalInvestmentGoal;
  const invDiff = investmentPreview.investmentDiff;
  const invPct = investmentPreview.investmentAchievementPercent;
  const invDiffPct = invPct - 100;

  const incomeInvestPct = planning.plannedSalary > 0 ? Math.round((derived.totalInvestmentGoal / planning.plannedSalary) * 100) : 0;
  const incomeExpensePct = planning.plannedSalary > 0 ? Math.max(0, 100 - incomeInvestPct) : 0;
  const dailyAvg = totalDays > 0 ? Math.max(0, subgoals.diarias?.amount ?? 0) / totalDays : 0;

  // Handlers: Renda do ciclo
  const handleAddExtra = () => {
    if (!newItem.description.trim()) {
      toast.error('Informe uma descrição para a renda extra.');
      return;
    }
    if (mutate(plan => addExtraIncome(plan, newItem))) {
      setNewItem({ description: '', amount: 0 });
      setIsAdding(false);
      toast.success('Renda extra adicionada.');
    }
  };

  const handleSaveIncome = () => {
    const ok = mutate(plan => {
      let next = setPlannedSalary(plan, salaryDraft);
      next = setReceivedSalary(next, salaryDraft);
      for (const item of next.extraIncomes) {
        const draftAmt = extraAmountsDraft[item.id];
        if (draftAmt !== undefined && draftAmt !== item.amount) {
          next = updateExtraIncome(next, item.id, { amount: draftAmt });
        }
      }
      if (isAdding && newItem.description.trim()) {
        next = addExtraIncome(next, newItem);
      }
      return next;
    });
    if (ok) {
      if (isAdding && newItem.description.trim()) {
        setNewItem({ description: '', amount: 0 });
        setIsAdding(false);
      }
      toast.success('Renda do ciclo salva.');
    }
  };

  const handleCancelIncome = () => {
    setSalaryDraft(planning.plannedSalary);
    setExtraAmountsDraft(Object.fromEntries(planning.extraIncomes.map(item => [item.id, item.amount])));
    setNewItem({ description: '', amount: 0 });
    setIsAdding(false);
  };

  // Handlers: Meta de investimento
  const handleSaveInvestment = () => {
    const ok = mutate(plan => {
      const next = setInvestmentBaseGoal(plan, investmentBaseDraft);
      return setInvestedAmount(next, investedDraft);
    });
    if (ok) {
      toast.success('Meta de investimento salva.');
    }
  };

  const handleCancelInvestment = () => {
    setInvestmentBaseDraft(planning.investmentBaseGoal);
    setInvestedDraft(derived.investedAmount);
  };

  // Handlers: Distribuição do orçamento
  const handleSaveDistribution = () => {
    if (distributionOver100) return;
    const ok = mutate(plan => {
      // Aplica reduções antes de aumentos para permitir trocas entre grupos sem ultrapassar 100% no meio
      const orderedIds = [...editableGroups]
        .map(g => g.id)
        .sort((a, b) => {
          const diffA = (distributionDraft[a] ?? 0) - (plan.distribution[a] ?? 0);
          const diffB = (distributionDraft[b] ?? 0) - (plan.distribution[b] ?? 0);
          return diffA - diffB;
        });
      let next = plan;
      for (const groupId of orderedIds) {
        const nextPct = roundMoney(distributionDraft[groupId] ?? 0);
        if (nextPct !== roundMoney(next.distribution[groupId] ?? 0)) {
          next = setDistributionPercent(next, groupId, nextPct);
        }
      }
      return next;
    });
    if (ok) {
      toast.success('Distribuição do orçamento salva.');
    }
  };

  const handleCancelDistribution = () => {
    setDistributionDraft({ ...planning.distribution });
  };

  const incomeError =
    salaryDraft < planning.investmentBaseGoal
      ? 'O salário do ciclo não pode ser menor que a meta de investimento.'
      : null;

  const investmentError =
    investmentBaseDraft > planning.plannedSalary
      ? 'Meta maior que o salário do ciclo salvo.'
      : null;

  const distributionError = distributionOver100
    ? `A soma dos grupos está em ${editablePercentSum}% (máximo 100%).`
    : null;

  return (
    <section className="space-y-4" aria-label="Planejamento do ciclo">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Card: Renda do ciclo */}
        <div data-tour="income-card" className="flex min-w-0 flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-card">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Renda do ciclo</h3>
                <p className="text-xs text-muted-foreground">Define os limites de gastos e o saldo disponível no ciclo</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor={`cycle-salary-${cycleId}`}>
                  Salário do ciclo
                </label>
                <CurrencyInput
                  id={`cycle-salary-${cycleId}`}
                  value={salaryDraft}
                  onChange={setSalaryDraft}
                  className="mt-1.5 h-11 text-sm"
                  disabled={readOnly}
                />
              </div>

              <div className="border-t border-border pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Rendas extras</span>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label="Adicionar renda extra"
                    onClick={() => setIsAdding(true)}
                    disabled={readOnly || isAdding}
                  >
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
                            value={draftDescription}
                            onChange={e => setDraftDescription(e.target.value)}
                            onBlur={() => {
                              if (editingId !== item.id) return;
                              setEditingId(null);
                              if (draftDescription.trim() === item.description) return;
                              if (!draftDescription.trim()) {
                                toast.error('A descrição não pode ficar vazia. O valor anterior foi mantido.');
                                return;
                              }
                              if (mutate(plan => updateExtraIncome(plan, item.id, { description: draftDescription }))) {
                                toast.success('Descrição atualizada.');
                              }
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
                              setDraftDescription(item.description);
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
                          value={extraAmountsDraft[item.id] ?? item.amount}
                          onChange={value =>
                            setExtraAmountsDraft(prev => ({ ...prev, [item.id]: value }))
                          }
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
                          onClick={() => {
                            if (mutate(plan => removeExtraIncome(plan, item.id))) {
                              toast.success('Renda extra removida.');
                            }
                          }}
                          disabled={readOnly}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {isAdding && (
                    <div className="space-y-2 rounded-xl border border-border bg-secondary/35 p-2.5">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          aria-label="Descrição da nova renda extra"
                          placeholder="Descrição (ex.: Freelance)"
                          value={newItem.description}
                          onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddExtra();
                            }
                            if (e.key === 'Escape') {
                              setNewItem({ description: '', amount: 0 });
                              setIsAdding(false);
                            }
                          }}
                          className="h-10 text-sm"
                          autoFocus
                        />
                        <CurrencyInput
                          aria-label="Valor da nova renda extra"
                          value={newItem.amount}
                          onChange={value => setNewItem({ ...newItem, amount: value })}
                          className="h-10 text-sm"
                        />
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1 px-2.5 text-xs"
                          onClick={() => {
                            setNewItem({ description: '', amount: 0 });
                            setIsAdding(false);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 gap-1 px-2.5 text-xs"
                          onClick={handleAddExtra}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Adicionar
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
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {formatCurrency(extraIncomePreviewTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <CardSaveFooter
            dirty={incomeDirty}
            readOnly={readOnly}
            errorMessage={incomeError}
            onSave={handleSaveIncome}
            onCancel={handleCancelIncome}
          />
        </div>

        {/* Card: Meta de investimento vs Realizado */}
        <div data-tour="investment-card" className="flex min-w-0 flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-card">
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
                  value={investmentBaseDraft}
                  onChange={setInvestmentBaseDraft}
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
                    onClick={() => setInvestedDraft(investmentBaseDraft)}
                    className="whitespace-nowrap text-xs font-semibold text-investment hover:underline disabled:opacity-50"
                  >
                    Igual à meta
                  </button>
                </div>
                <CurrencyInput
                  id={`invested-amount-${cycleId}`}
                  value={investedDraft}
                  onChange={setInvestedDraft}
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

          <CardSaveFooter
            dirty={investmentDirty}
            readOnly={readOnly}
            errorMessage={investmentError}
            onSave={handleSaveInvestment}
            onCancel={handleCancelInvestment}
          />
        </div>
      </div>

      {/* Card: Distribuição do orçamento com barra segmentada + Resumo do fluxo da renda */}
      <div data-tour="distribution-card" className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-card">
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
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${
              distributionOver100
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {distributionOver100 ? `${editablePercentSum}% (excede 100%)` : `${totalPercent}% alocado`}
          </span>
        </div>

        {/* Barra Visual Segmentada */}
        <div className="mb-5 space-y-2">
          <div className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full bg-secondary" role="img" aria-label="Distribuição percentual do orçamento por grupo">
            {budgetGroups.map(group => {
              const pct = Math.max(0, subgoals[group.id]?.percent ?? 0);
              if (pct <= 0) return null;
              const styles = getGroupColorStyles(group.color);
              return (
                <div
                  key={group.id}
                  title={`${group.name}: ${pct}%`}
                  className={`h-full transition-all ${styles.barClass}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
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
                  {group.name} ({Math.max(0, subgoals[group.id]?.percent ?? 0)}%)
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
              const pct = distributionDraft[group.id] ?? 0;
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
                  <div className="grid grid-cols-2 gap-2.5 sm:contents">
                    <div>
                      <span className="mb-1 block text-xs text-muted-foreground sm:hidden">Percentual (%)</span>
                      <PercentInput
                        value={pct}
                        disabled={readOnly}
                        ariaLabel={`Percentual de ${group.name}`}
                        onCommit={val =>
                          setDistributionDraft(prev => ({ ...prev, [group.id]: roundMoney(val) }))
                        }
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-xs text-muted-foreground sm:hidden">Limite no ciclo (R$)</span>
                      <CurrencyInput
                        aria-label={`Limite em reais de ${group.name}`}
                        value={amt}
                        onChange={amount => {
                          if (derived.mainExpenseGoal <= 0) {
                            if (amount > 0) {
                              toast.error('Defina e salve o salário planejado antes de distribuir valores.');
                            }
                            return;
                          }
                          const nextPct = roundMoney((amount / derived.mainExpenseGoal) * 100);
                          setDistributionDraft(prev => ({ ...prev, [group.id]: nextPct }));
                        }}
                        className="h-11 text-sm"
                        disabled={readOnly}
                      />
                    </div>
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
                <span>{Math.max(0, subgoals.diarias?.percent ?? 0)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold tabular-nums sm:justify-end">
                <span className="text-xs font-normal text-muted-foreground sm:hidden">Limite no ciclo:</span>
                <span>{formatCurrency(Math.max(0, subgoals.diarias?.amount ?? 0))}</span>
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
                <span className="text-muted-foreground">Salário do ciclo</span>
                <span className="font-semibold tabular-nums">{formatCurrency(planning.plannedSalary)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">(-) Reserva de investimento</span>
                <span className="font-semibold text-investment tabular-nums">- {formatCurrency(derived.totalInvestmentGoal)}</span>
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

        <CardSaveFooter
          dirty={distributionDirty}
          readOnly={readOnly}
          errorMessage={distributionError}
          onSave={handleSaveDistribution}
          onCancel={handleCancelDistribution}
        />
      </div>
    </section>
  );
}
