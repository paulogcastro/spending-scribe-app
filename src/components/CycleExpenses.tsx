import { useState } from 'react';
import { Car, Home, Receipt, Plus, Pencil, Trash2, Repeat2, CreditCard, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { useExpenseDomain } from '@/hooks/useExpenseDomain';
import { removeManualExpense, plannedCommitments, correctCommitmentOccurrence, type ExpenseOccurrence, type ManualExpenseGroup } from '@/lib/expenseDomain';
import { computeCategoryBreakdown } from '@/lib/cycleOverview';
import type { BudgetGroup } from '@/lib/cyclePlanning';
import { formatCurrency, formatDate } from '@/lib/format';
import { ExpenseCatalogs } from '@/components/ExpenseCatalogs';
import { CycleCommitments } from '@/components/CycleCommitments';
import { getFinancialCycle } from '@/lib/financialCycles';

const areas = [
  { group: 'carro', label: 'Carro', icon: Car, badgeClass: 'bg-category-transport/15 text-category-transport' },
  { group: 'casa', label: 'Casa', icon: Home, badgeClass: 'bg-warning/15 text-warning' },
  { group: 'fixos', label: 'Gastos fixos', icon: Repeat2, badgeClass: 'bg-category-entertainment/15 text-category-entertainment' },
  { group: 'parcelados', label: 'Parcelados', icon: CreditCard, badgeClass: 'bg-category-shopping/15 text-category-shopping' },
  { group: 'diarias', label: 'Gastos diários', icon: Receipt, badgeClass: 'bg-primary/10 text-primary' },
] as const;

const categoryBarPalette = [
  'bg-primary',
  'bg-category-transport',
  'bg-warning',
  'bg-category-entertainment',
  'bg-category-shopping',
  'bg-category-health',
  'bg-investment',
  'bg-category-other',
] as const;

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
  subgoals?: Record<BudgetGroup, { percent: number; amount: number }>;
  onAdd: (group: ManualExpenseGroup) => void;
  onEdit: (item: ExpenseOccurrence) => void;
}) {
  const [pending, setPending] = useState<ExpenseOccurrence | null>(null);
  const [correction, setCorrection] = useState<{ item: ExpenseOccurrence; amount: number } | null>(null);
  const todayCycle = getFinancialCycle().id;
  const realized = domain.state.cycles[cycleId] ?? [];
  const projected = cycleId > todayCycle
    ? plannedCommitments(domain.state, cycleId).filter(item => !realized.some(value => value.definitionId === item.definitionId))
    : [];
  const categoryBreakdown = computeCategoryBreakdown(domain.state, cycleId);

  return (
    <section aria-label="Despesas do ciclo" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Lançamentos do ciclo</h2>
          <p className="text-xs text-muted-foreground">{periodLabel}</p>
        </div>
        <ExpenseCatalogs domain={domain} />
      </div>

      {domain.readOnly && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível recuperar as despesas. Os dados originais foram preservados; alterações estão suspensas.
        </div>
      )}

      {/* Gráfico de Gastos por Categoria */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Gastos por categoria</h3>
              <p className="text-xs text-muted-foreground">Distribuição dos lançamentos realizados no ciclo</p>
            </div>
          </div>
          {categoryBreakdown.length > 0 && (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums">
              {categoryBreakdown.length} {categoryBreakdown.length === 1 ? 'categoria' : 'categorias'}
            </span>
          )}
        </div>

        {categoryBreakdown.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">
            Adicione despesas neste ciclo para visualizar a distribuição por categoria.
          </p>
        ) : (
          <div className="space-y-3">
            {categoryBreakdown.map((entry, index) => {
              const barColor = categoryBarPalette[index % categoryBarPalette.length];
              return (
                <div key={entry.categoryId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-foreground">{entry.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      <strong className="font-semibold text-foreground">{formatCurrency(entry.amount)}</strong> · {entry.percent}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.max(entry.percent, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cards por Grupo Orçamentário */}
      <div className="space-y-4">
        {areas.map(({ group, label, icon: Icon, badgeClass }) => {
          const items = [...realized, ...projected]
            .filter(item => item.group === group)
            .sort((a, b) => b.date.localeCompare(a.date));
          const total = realized.filter(item => item.group === group).reduce((sum, value) => sum + value.amount, 0);
          const forecast = projected.filter(item => item.group === group).reduce((sum, value) => sum + value.amount, 0);
          const groupGoal = subgoals?.[group]?.amount ?? 0;
          const groupRatio = groupGoal > 0 ? Math.min(100, Math.round((total / groupGoal) * 100)) : 0;
          const isOverGroupGoal = groupGoal > 0 && total > groupGoal;
          const isNearGroupGoal = !isOverGroupGoal && groupGoal > 0 && groupRatio >= 85;

          return (
            <section
              key={group}
              aria-label={`${label} do ciclo`}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${badgeClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold">{label}</h3>
                      {forecast > 0 && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                          Previsto: {formatCurrency(forecast)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {groupGoal > 0 && (
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full ${
                              isOverGroupGoal ? 'bg-destructive' : isNearGroupGoal ? 'bg-warning' : 'bg-primary'
                            }`}
                            style={{ width: `${groupRatio}%` }}
                          />
                        </div>
                      )}
                      <span className={`text-xs tabular-nums ${isOverGroupGoal ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                        <strong className="font-semibold text-foreground">{formatCurrency(total)}</strong>
                        {groupGoal > 0 ? ` de ${formatCurrency(groupGoal)}` : ' realizado'}
                      </span>
                    </div>
                  </div>
                </div>

                {(group === 'carro' || group === 'casa' || group === 'diarias') && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={domain.readOnly}
                    onClick={() => onAdd(group)}
                    aria-label={`Adicionar despesa em ${label}`}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Adicionar
                  </Button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="px-5 py-6 text-center text-xs text-muted-foreground">
                  Nenhum lançamento registrado em <strong className="font-medium text-foreground">{label}</strong> neste ciclo.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map(item => {
                    const isProjected = projected.includes(item);
                    const categoryName = domain.state.categories[item.categoryId]?.name;
                    const paymentName = domain.state.paymentMethods[item.paymentMethodId]?.name;
                    return (
                      <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/30">
                        <div className="min-w-0 flex-1 basis-48 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-words text-sm font-semibold">{item.description}</p>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                item.nature === 'avulso'
                                  ? 'bg-secondary text-muted-foreground'
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
                                <span className="rounded-md bg-secondary px-1.5 py-0.5 font-medium text-foreground">
                                  {categoryName}
                                </span>
                              </>
                            )}
                            {paymentName && (
                              <span className="rounded-md bg-secondary/70 px-1.5 py-0.5">
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
                              if (item.nature !== 'avulso') setCorrection({ item, amount: item.amount });
                              else if (group === 'carro' || group === 'casa' || group === 'diarias') onEdit(item);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {item.nature === 'avulso' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10"
                              title={`Excluir ${item.description}`}
                              aria-label={`Excluir despesa ${item.description}`}
                              disabled={domain.readOnly}
                              onClick={() => setPending(item)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
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

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <CycleCommitments domain={domain} cycleId={cycleId} />
      </div>

      <Dialog open={correction !== null} onOpenChange={open => { if (!open) setCorrection(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corrigir valor neste ciclo</DialogTitle>
            <DialogDescription>{correction?.item.description} · {periodLabel}. O valor dos outros ciclos permanece inalterado.</DialogDescription>
          </DialogHeader>
          {correction && (
            <form
              className="space-y-4"
              onSubmit={event => {
                event.preventDefault();
                if (domain.mutate(state => correctCommitmentOccurrence(state, cycleId, correction.item.id, correction.amount))) {
                  setCorrection(null);
                }
              }}
            >
              <div>
                <Label htmlFor="occurrence-amount">Valor desta ocorrência</Label>
                <CurrencyInput id="occurrence-amount" value={correction.amount} onChange={amount => setCorrection({ ...correction, amount })} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCorrection(null)}>Cancelar</Button>
                <Button type="submit" disabled={domain.readOnly}>Salvar correção</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={pending !== null} onOpenChange={open => { if (!open) setPending(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir despesa?</DialogTitle>
            <DialogDescription>{pending?.description} · {formatCurrency(pending?.amount ?? 0)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={domain.readOnly}
              onClick={() => {
                if (pending && domain.mutate(state => removeManualExpense(state, cycleId, pending.id))) setPending(null);
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