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
  Save,
  AlertCircle,
  Pencil,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { localExpenseDate, type BudgetGroupRecord } from '@/lib/expenseDomain';
import { getGroupColorStyles } from '@/components/budgetGroupStyles';
import { useCyclePlanning } from '@/hooks/useCyclePlanning';

function formatReceiptDate(isoDate?: string): string {
  if (!isoDate) return 'Data não informada';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

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

interface ExtraIncomeEditor {
  id?: string;
  description: string;
  amount: number;
  date: string;
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
  const [extraEditor, setExtraEditor] = useState<ExtraIncomeEditor | null>(null);

  // Draft: Meta de investimento
  const [investmentBaseDraft, setInvestmentBaseDraft] = useState(planning.investmentBaseGoal);
  const [investedDraft, setInvestedDraft] = useState(derived.investedAmount);

  // Draft: Distribuição do orçamento
  const [distributionDraft, setDistributionDraft] = useState<Record<string, number>>(() => ({
    ...planning.distribution,
  }));

  useEffect(() => {
    setSalaryDraft(planning.plannedSalary);
  }, [planning.plannedSalary]);

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
  const incomeDirty = salaryDraft !== planning.plannedSalary;

  const investmentDirty =
    investmentBaseDraft !== planning.investmentBaseGoal ||
    investedDraft !== derived.investedAmount;

  const distributionDirty = editableGroups.some(
    g => roundMoney(distributionDraft[g.id] ?? 0) !== roundMoney(planning.distribution[g.id] ?? 0)
  );

  // Live previews using pure functions
  const totalCycleIncomePreview = roundMoney(salaryDraft + derived.extraIncomeTotal);

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

  const sortedExtraIncomes = useMemo(
    () => [...planning.extraIncomes].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [planning.extraIncomes]
  );

  // Handlers: Renda do ciclo
  const handleSaveSalary = () => {
    const ok = mutate(plan => {
      const next = setPlannedSalary(plan, salaryDraft);
      return setReceivedSalary(next, salaryDraft);
    });
    if (ok) {
      toast.success('Salário do ciclo salvo.');
    }
  };

  const handleCancelSalary = () => {
    setSalaryDraft(planning.plannedSalary);
  };

  const handleSaveExtraModal = (event: React.FormEvent) => {
    event.preventDefault();
    if (!extraEditor) return;
    if (!extraEditor.description.trim()) {
      toast.error('Informe uma descrição para a renda extra.');
      return;
    }
    const ok = mutate(plan => {
      if (extraEditor.id) {
        return updateExtraIncome(plan, extraEditor.id, {
          description: extraEditor.description,
          amount: extraEditor.amount,
          date: extraEditor.date || undefined,
        });
      }
      return addExtraIncome(plan, {
        description: extraEditor.description,
        amount: extraEditor.amount,
        date: extraEditor.date || undefined,
      });
    });
    if (ok) {
      toast.success(extraEditor.id ? 'Renda extra atualizada.' : 'Renda extra adicionada.');
      setExtraEditor(null);
    }
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
          <div className="space-y-4">
            <div className="flex min-h-[2.75rem] flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Renda do ciclo</h3>
                  <p className="text-xs text-muted-foreground">Salário e entradas extras que compõem o ciclo</p>
                </div>
              </div>
              {totalCycleIncomePreview > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary tabular-nums">
                  Total: {formatCurrency(totalCycleIncomePreview)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor={`cycle-salary-${cycleId}`}>
                    Salário do ciclo
                  </label>
                </div>
                <CurrencyInput
                  id={`cycle-salary-${cycleId}`}
                  value={salaryDraft}
                  onChange={setSalaryDraft}
                  className="mt-1.5 h-11 text-sm"
                  disabled={readOnly}
                />
              </div>
              <div>
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Total de rendas extras</span>
                  {planning.extraIncomes.length > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {planning.extraIncomes.length} {planning.extraIncomes.length === 1 ? 'entrada' : 'entradas'}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex h-11 items-center justify-between rounded-md border border-border bg-secondary/45 px-3 text-sm font-bold text-foreground tabular-nums">
                  <span>{formatCurrency(derived.extraIncomeTotal)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Rendas extras do ciclo</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label="Adicionar renda extra"
                  disabled={readOnly}
                  onClick={() =>
                    setExtraEditor({
                      description: '',
                      amount: 0,
                      date: localExpenseDate(),
                    })
                  }
                  className="h-8 gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nova renda extra
                </Button>
              </div>

              {sortedExtraIncomes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  Nenhuma renda extra registrada neste ciclo.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {sortedExtraIncomes.map(item => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.description}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3 shrink-0" />
                          <span>{formatReceiptDate(item.date)}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="mr-1 text-sm font-semibold text-success tabular-nums">
                          + {formatCurrency(item.amount)}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Editar ${item.description}`}
                          title="Editar renda extra"
                          className="h-8 w-8"
                          disabled={readOnly}
                          onClick={() =>
                            setExtraEditor({
                              id: item.id,
                              description: item.description,
                              amount: item.amount,
                              date: item.date ?? '',
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Remover ${item.description}`}
                          title="Remover renda extra"
                          className="h-8 w-8"
                          disabled={readOnly}
                          onClick={() => {
                            if (mutate(plan => removeExtraIncome(plan, item.id))) {
                              toast.success('Renda extra removida.');
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <CardSaveFooter
            dirty={incomeDirty}
            readOnly={readOnly}
            errorMessage={incomeError}
            onSave={handleSaveSalary}
            onCancel={handleCancelSalary}
          />
        </div>

        {/* Card: Meta de investimento vs Realizado */}
        <div data-tour="investment-card" className="flex min-w-0 flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="space-y-4">
            <div className="flex min-h-[2.75rem] flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-investment/10">
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

            <div className="space-y-3 border-t border-border pt-4">
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

              <div className="space-y-2">
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
                              toast.error('Defina e salve o salário do ciclo antes de distribuir valores.');
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

      {/* Modal: Nova / Editar renda extra */}
      <Dialog open={extraEditor !== null} onOpenChange={open => { if (!open) setExtraEditor(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{extraEditor?.id ? 'Editar renda extra' : 'Nova renda extra'}</DialogTitle>
            <DialogDescription>
              Entradas extras somam ao saldo disponível do ciclo sem alterar o limite de gastos.
            </DialogDescription>
          </DialogHeader>
          {extraEditor && (
            <form className="finance-form" onSubmit={handleSaveExtraModal}>
              <div className="form-wide">
                <Label htmlFor="extra-income-description">Descrição</Label>
                <Input
                  id="extra-income-description"
                  required
                  placeholder="Ex.: Freelance, 13º salário, Venda"
                  value={extraEditor.description}
                  onChange={e => setExtraEditor({ ...extraEditor, description: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="extra-income-amount">Valor recebido</Label>
                <CurrencyInput
                  id="extra-income-amount"
                  required
                  value={extraEditor.amount}
                  onChange={amount => setExtraEditor({ ...extraEditor, amount })}
                />
              </div>
              <div>
                <Label htmlFor="extra-income-date">Data do recebimento</Label>
                <Input
                  id="extra-income-date"
                  type="date"
                  value={extraEditor.date}
                  onChange={e => setExtraEditor({ ...extraEditor, date: e.target.value })}
                />
              </div>
              <DialogFooter className="form-actions">
                <Button type="button" variant="outline" onClick={() => setExtraEditor(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={readOnly}>
                  Salvar renda extra
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
