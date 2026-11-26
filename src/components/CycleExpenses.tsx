import { useState } from 'react';
import { Plus, Pencil, Trash2, Repeat2, CreditCard, PieChart, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { useExpenseDomain } from '@/hooks/useExpenseDomain';
import {
  cancelCommitmentFromCycle,
  getBudgetGroupsMap,
  getOrderedBudgetGroups,
  isExpenseNatureCompatible,
  plannedCommitments,
  removeCommitmentOccurrenceInCycle,
  removeManualExpense,
  updateCommitmentFromCycle,
  updateCommitmentOccurrenceInCycle,
  type BudgetGroupRecord,
  type ExpenseOccurrence,
  type ManualExpenseGroup,
} from '@/lib/expenseDomain';
import { computeCategoryBreakdown } from '@/lib/cycleOverview';
import { formatCurrency, formatDate } from '@/lib/format';
import { CycleCommitments } from '@/components/CycleCommitments';
import { getGroupColorStyles, getGroupIcon } from '@/components/budgetGroupStyles';
import { getFinancialCycle } from '@/lib/financialCycles';

const donutPalette = [
  { stroke: 'hsl(var(--primary))', dot: 'bg-primary' },
  { stroke: 'hsl(var(--category-transport))', dot: 'bg-category-transport' },
  { stroke: 'hsl(var(--warning))', dot: 'bg-warning' },
  { stroke: 'hsl(var(--category-entertainment))', dot: 'bg-category-entertainment' },
  { stroke: 'hsl(var(--category-shopping))', dot: 'bg-category-shopping' },
  { stroke: 'hsl(var(--category-health))', dot: 'bg-category-health' },
  { stroke: 'hsl(var(--investment))', dot: 'bg-investment' },
  { stroke: 'hsl(var(--category-other))', dot: 'bg-category-other' },
] as const;

interface CommitmentEditState {
  item: ExpenseOccurrence;
  scope: 'single' | 'future';
  description: string;
  amount: number;
  categoryId: string;
  paymentMethodId: string;
  note: string;
}

export function CycleExpenses({
  cycleId,
  periodLabel,
  domain,
  subgoals,
  onAdd,
  onEdit,
}: {
  cycleId: string;
  periodLabel: string;
  domain: ReturnType<typeof useExpenseDomain>;
  subgoals?: Record<string, { percent: number; amount: number }>;
  onAdd: (group: ManualExpenseGroup) => void;
  onEdit: (item: ExpenseOccurrence) => void;
}) {
  const [pendingManual, setPendingManual] = useState<ExpenseOccurrence | null>(null);
  const [pendingCommitmentDelete, setPendingCommitmentDelete] = useState<ExpenseOccurrence | null>(null);
  const [commitmentEdit, setCommitmentEdit] = useState<CommitmentEditState | null>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [commitmentsOpen, setCommitmentsOpen] = useState(false);

  const todayCycle = getFinancialCycle().id;
  const realized = domain.state.cycles[cycleId] ?? [];
  const projected = cycleId > todayCycle
    ? plannedCommitments(domain.state, cycleId).filter(item => !realized.some(value => value.definitionId === item.definitionId))
    : [];
  const allItems = [...realized, ...projected];
  const categoryBreakdown = computeCategoryBreakdown(domain.state, cycleId);
  const categoryTotal = categoryBreakdown.reduce((sum, item) => sum + item.amount, 0);

  const groupsMap = getBudgetGroupsMap(domain.state);
  const activeOrdered = getOrderedBudgetGroups(domain.state);
  const inactiveWithItems: BudgetGroupRecord[] = Object.values(groupsMap).filter(
    g => !g.active && allItems.some(item => item.group === g.id)
  );
  const visibleGroups = [...activeOrdered, ...inactiveWithItems];

  const openCommitmentEdit = (item: ExpenseOccurrence) => {
    setCommitmentEdit({
      item,
      scope: 'single',
      description: item.description,
      amount: item.amount,
      categoryId: item.categoryId,
      paymentMethodId: item.paymentMethodId,
      note: item.note ?? '',
    });
  };

  return (
    <section aria-label="Despesas do ciclo" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Lançamentos do ciclo</h2>
          <p className="text-xs text-muted-foreground">{periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setChartOpen(true)}>
            <PieChart className="mr-1.5 h-4 w-4" />
            Por categoria
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCommitmentsOpen(true)}>
            <Repeat2 className="mr-1.5 h-4 w-4" />
            Recorrências e parcelas
          </Button>
        </div>
      </div>

      {domain.readOnly && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível recuperar as despesas. Os dados originais foram preservados; alterações estão suspensas.
        </div>
      )}

      {/* Cards por Grupo Orçamentário (dinâmicos e ordenados conforme Configurações) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {visibleGroups.map((groupRecord, index) => {
          const Icon = getGroupIcon(groupRecord.icon);
          const styles = getGroupColorStyles(groupRecord.color);
          const items = allItems
            .filter(item => item.group === groupRecord.id)
            .sort((a, b) => b.date.localeCompare(a.date));
          const total = realized.filter(item => item.group === groupRecord.id).reduce((sum, value) => sum + value.amount, 0);
          const forecast = projected.filter(item => item.group === groupRecord.id).reduce((sum, value) => sum + value.amount, 0);
          const groupGoal = subgoals?.[groupRecord.id]?.amount ?? 0;
          const groupRatio = groupGoal > 0 ? Math.min(100, Math.round((total / groupGoal) * 100)) : 0;
          const isOverGroupGoal = groupGoal > 0 && total > groupGoal;
          const isNearGroupGoal = !isOverGroupGoal && groupGoal > 0 && groupRatio >= 85;
          const acceptsManual = groupRecord.active && isExpenseNatureCompatible(groupRecord.id, 'avulso', groupsMap);
          const isOddLast = visibleGroups.length % 2 === 1 && index === visibleGroups.length - 1;

          return (
            <section
              key={groupRecord.id}
              aria-label={`${groupRecord.name} do ciclo`}
              className={`overflow-hidden rounded-2xl border shadow-card transition-shadow hover:shadow-card-hover ${styles.cardClass} ${isOddLast ? 'lg:col-span-2' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${styles.badgeClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold">{groupRecord.name}</h3>
                      {!groupRecord.active && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">Inativo</span>
                      )}
                      {forecast > 0 && (
                        <span className="rounded-full bg-card/80 px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                          Previsto: {formatCurrency(forecast)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {groupGoal > 0 && (
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary/80">
                          <div
                            className={`h-full rounded-full ${
                              isOverGroupGoal ? 'bg-destructive' : isNearGroupGoal ? 'bg-warning' : styles.barClass
                            }`}
                            style={{ width: `${groupRatio}%` }}
                          />
                        </div>
                      )}
                      <span className={`text-xs tabular-nums ${isOverGroupGoal ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                        <strong className="font-semibold text-foreground">{formatCurrency(total)}</strong>
                        {groupGoal > 0 ? ` de ${formatCurrency(groupGoal)}` : ' realizado'}
                      </span>
                    </div>
                  </div>
                </div>

                {groupRecord.active && (
                  acceptsManual ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-card/85 hover:bg-card"
                      disabled={domain.readOnly}
                      onClick={() => onAdd(groupRecord.id)}
                      aria-label={`Adicionar despesa em ${groupRecord.name}`}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Adicionar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-card/85 hover:bg-card"
                      disabled={domain.readOnly}
                      onClick={() => setCommitmentsOpen(true)}
                      aria-label={`Gerenciar ${groupRecord.name}`}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      {groupRecord.allowedNatures.includes('recorrente') ? 'Recorrente' : 'Parcelamento'}
                    </Button>
                  )
                )}
              </div>

              {items.length === 0 ? (
                <div className="px-5 py-6 text-center text-xs text-muted-foreground">
                  Nenhum lançamento registrado em <strong className="font-medium text-foreground">{groupRecord.name}</strong> neste ciclo.
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {items.map(item => {
                    const isProjected = projected.includes(item);
                    const categoryName = domain.state.categories[item.categoryId]?.name;
                    const paymentName = domain.state.paymentMethods[item.paymentMethodId]?.name;
                    return (
                      <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-card/50">
                        <div className="min-w-0 flex-1 basis-48 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-words text-sm font-semibold">{item.description}</p>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                item.nature === 'avulso'
                                  ? 'bg-secondary/90 text-muted-foreground'
                                  : 'bg-primary/10 text-primary'
                              }`}
                            >
                              {item.nature === 'recorrente' ? (
                                <Repeat2 className="h-3 w-3" />
                              ) : item.nature === 'parcelado' ? (
                                <CreditCard className="h-3 w-3" />
                              ) : (
                                <Receipt className="h-3 w-3" />
                              )}
                              {item.installment
                                ? `Parcela ${item.installment.number}/${item.installment.total}`
                                : item.nature === 'recorrente'
                                  ? 'Recorrente'
                                  : 'Avulso'}
                            </span>
                            {isProjected && (
                              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                                Previsto
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="tabular-nums">{formatDate(item.date)} {item.date.slice(0, 4)}</span>
                            {categoryName && (
                              <>
                                <span>·</span>
                                <span className="rounded-md bg-card/90 px-1.5 py-0.5 font-medium text-foreground">
                                  {categoryName}
                                </span>
                              </>
                            )}
                            {paymentName && (
                              <span className="rounded-md bg-secondary/80 px-1.5 py-0.5">
                                {paymentName}
                              </span>
                            )}
                          </div>

                          {item.note && (
                            <p className="break-words text-xs text-muted-foreground">{item.note}</p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <span className={`mr-1 text-sm font-bold tabular-nums ${isProjected ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {formatCurrency(item.amount)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            title={`Editar ${item.description}`}
                            aria-label={`Editar despesa ${item.description}`}
                            disabled={domain.readOnly || isProjected}
                            onClick={() => {
                              if (item.nature === 'avulso') onEdit(item);
                              else openCommitmentEdit(item);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            title={`Excluir ${item.description}`}
                            aria-label={`Excluir despesa ${item.description}`}
                            disabled={domain.readOnly || isProjected}
                            onClick={() => {
                              if (item.nature === 'avulso') setPendingManual(item);
                              else setPendingCommitmentDelete(item);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* Modal: Gráfico Donut de Gastos por Categoria */}
      <Dialog open={chartOpen} onOpenChange={setChartOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Gastos por categoria
            </DialogTitle>
            <DialogDescription>{periodLabel} · Lançamentos realizados no ciclo</DialogDescription>
          </DialogHeader>

          {categoryBreakdown.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Adicione despesas neste ciclo para visualizar a distribuição por categoria.
            </p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-center py-2">
                <div className="relative flex items-center justify-center">
                  <svg width="180" height="180" viewBox="0 0 42 42" className="-rotate-90" role="img" aria-label="Gráfico de gastos por categoria">
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="hsl(var(--secondary))" strokeWidth="5" />
                    {(() => {
                      let offset = 0;
                      return categoryBreakdown.map((entry, index) => {
                        const pct = categoryTotal > 0 ? (entry.amount / categoryTotal) * 100 : 0;
                        const currentOffset = offset;
                        offset += pct;
                        return (
                          <circle
                            key={entry.categoryId}
                            cx="21"
                            cy="21"
                            r="15.915"
                            fill="transparent"
                            stroke={donutPalette[index % donutPalette.length].stroke}
                            strokeWidth="5"
                            strokeDasharray={`${pct} ${100 - pct}`}
                            strokeDashoffset={-currentOffset}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute text-center">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-bold tabular-nums">{formatCurrency(categoryTotal)}</p>
                  </div>
                </div>
              </div>

              <ul className="max-h-60 space-y-2.5 overflow-y-auto pr-1 text-xs">
                {categoryBreakdown.map((entry, index) => (
                  <li key={entry.categoryId} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${donutPalette[index % donutPalette.length].dot}`} />
                      <span className="truncate font-medium text-foreground">{entry.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      <strong className="font-semibold text-foreground">{formatCurrency(entry.amount)}</strong> ({entry.percent}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Gerenciar Recorrências e Parcelamentos */}
      <Dialog open={commitmentsOpen} onOpenChange={setCommitmentsOpen}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recorrências e parcelamentos</DialogTitle>
            <DialogDescription>
              Cadastre novos compromissos, ajuste valores futuros, suspenda ou consulte a previsão dos próximos 12 ciclos.
            </DialogDescription>
          </DialogHeader>
          <CycleCommitments domain={domain} cycleId={cycleId} />
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Recorrente ou Parcelado com escolha de escopo */}
      <Dialog open={commitmentEdit !== null} onOpenChange={open => { if (!open) setCommitmentEdit(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar {commitmentEdit?.item.nature === 'parcelado' ? 'parcelamento' : 'recorrência'}
            </DialogTitle>
            <DialogDescription>
              {commitmentEdit?.item.description} · {periodLabel}
            </DialogDescription>
          </DialogHeader>
          {commitmentEdit && (
            <form
              className="space-y-4"
              onSubmit={event => {
                event.preventDefault();
                const { item, scope, description, amount, categoryId, paymentMethodId, note } = commitmentEdit;
                const updates = { description, amount, categoryId, paymentMethodId, note: note || undefined };
                const ok = domain.mutate(state => {
                  if (scope === 'single' || !item.definitionId) {
                    return updateCommitmentOccurrenceInCycle(state, cycleId, item.id, updates);
                  }
                  const kind = item.nature === 'parcelado' ? 'parcelado' : 'recorrente';
                  return updateCommitmentFromCycle(state, kind, item.definitionId, cycleId, updates);
                });
                if (ok) setCommitmentEdit(null);
              }}
            >
              <div className="space-y-2">
                <Label>Aplicar alteração em</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setCommitmentEdit({ ...commitmentEdit, scope: 'single' })}
                    className={`rounded-xl border p-3 text-left text-xs transition ${
                      commitmentEdit.scope === 'single'
                        ? 'border-primary bg-primary/10 font-semibold text-primary'
                        : 'border-border bg-secondary/40 text-muted-foreground'
                    }`}
                  >
                    Apenas neste ciclo
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommitmentEdit({ ...commitmentEdit, scope: 'future' })}
                    className={`rounded-xl border p-3 text-left text-xs transition ${
                      commitmentEdit.scope === 'future'
                        ? 'border-primary bg-primary/10 font-semibold text-primary'
                        : 'border-border bg-secondary/40 text-muted-foreground'
                    }`}
                  >
                    {commitmentEdit.item.nature === 'parcelado'
                      ? 'Esta e as próximas parcelas'
                      : 'Este ciclo e os próximos'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-comm-desc">Descrição</Label>
                <Input
                  id="edit-comm-desc"
                  required
                  value={commitmentEdit.description}
                  onChange={e => setCommitmentEdit({ ...commitmentEdit, description: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-comm-amount">Valor</Label>
                <CurrencyInput
                  id="edit-comm-amount"
                  value={commitmentEdit.amount}
                  onChange={amount => setCommitmentEdit({ ...commitmentEdit, amount })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-comm-cat">Categoria</Label>
                  <Select
                    value={commitmentEdit.categoryId}
                    onValueChange={categoryId => setCommitmentEdit({ ...commitmentEdit, categoryId })}
                  >
                    <SelectTrigger id="edit-comm-cat"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(domain.state.categories)
                        .filter(c => c.active || c.id === commitmentEdit.item.categoryId)
                        .map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}{c.active ? '' : ' (inativa)'}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-comm-pay">Forma de pagamento</Label>
                  <Select
                    value={commitmentEdit.paymentMethodId}
                    onValueChange={paymentMethodId => setCommitmentEdit({ ...commitmentEdit, paymentMethodId })}
                  >
                    <SelectTrigger id="edit-comm-pay"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(domain.state.paymentMethods)
                        .filter(p => p.active || p.id === commitmentEdit.item.paymentMethodId)
                        .map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}{p.active ? '' : ' (inativa)'}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-comm-note">Observação (opcional)</Label>
                <Input
                  id="edit-comm-note"
                  value={commitmentEdit.note}
                  onChange={e => setCommitmentEdit({ ...commitmentEdit, note: e.target.value })}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCommitmentEdit(null)}>Cancelar</Button>
                <Button type="submit" disabled={domain.readOnly}>Salvar alteração</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Excluir Recorrente ou Parcelado com escolha de escopo */}
      <Dialog open={pendingCommitmentDelete !== null} onOpenChange={open => { if (!open) setPendingCommitmentDelete(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Excluir {pendingCommitmentDelete?.nature === 'parcelado' ? 'parcelamento' : 'gasto recorrente'}?
            </DialogTitle>
            <DialogDescription>
              {pendingCommitmentDelete?.description} · {formatCurrency(pendingCommitmentDelete?.amount ?? 0)}. Escolha como deseja excluir:
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              disabled={domain.readOnly}
              onClick={() => {
                if (!pendingCommitmentDelete) return;
                if (domain.mutate(state => removeCommitmentOccurrenceInCycle(state, cycleId, pendingCommitmentDelete.id))) {
                  setPendingCommitmentDelete(null);
                }
              }}
            >
              Excluir apenas deste ciclo
            </Button>
            <Button
              variant="destructive"
              disabled={domain.readOnly}
              onClick={() => {
                if (!pendingCommitmentDelete?.definitionId) return;
                const kind = pendingCommitmentDelete.nature === 'parcelado' ? 'parcelado' : 'recorrente';
                if (domain.mutate(state => cancelCommitmentFromCycle(state, kind, pendingCommitmentDelete.definitionId!, cycleId))) {
                  setPendingCommitmentDelete(null);
                }
              }}
            >
              {pendingCommitmentDelete?.nature === 'parcelado'
                ? 'Excluir esta e todas as próximas parcelas'
                : 'Excluir deste ciclo e dos próximos'}
            </Button>
            <Button variant="ghost" onClick={() => setPendingCommitmentDelete(null)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Excluir despesa avulsa */}
      <Dialog open={pendingManual !== null} onOpenChange={open => { if (!open) setPendingManual(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir despesa?</DialogTitle>
            <DialogDescription>{pendingManual?.description} · {formatCurrency(pendingManual?.amount ?? 0)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingManual(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={domain.readOnly}
              onClick={() => {
                if (pendingManual && domain.mutate(state => removeManualExpense(state, cycleId, pendingManual.id))) setPendingManual(null);
              }}
            >
              Confirmar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}