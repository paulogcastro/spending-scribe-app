import { useState } from 'react';
import { Car, Home, Receipt, Plus, Pencil, Trash2, Repeat2, CreditCard, PieChart } from 'lucide-react';
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
  {
    group: 'diarias',
    label: 'Gastos diários',
    icon: Receipt,
    cardClass: 'group-card-diarias',
    badgeClass: 'bg-destructive/15 text-destructive',
    barClass: 'bg-destructive',
    spanClass: '',
  },
  {
    group: 'casa',
    label: 'Casa',
    icon: Home,
    cardClass: 'group-card-casa',
    badgeClass: 'bg-warning/15 text-warning',
    barClass: 'bg-warning',
    spanClass: '',
  },
  {
    group: 'carro',
    label: 'Carro',
    icon: Car,
    cardClass: 'group-card-carro',
    badgeClass: 'bg-category-transport/15 text-category-transport',
    barClass: 'bg-category-transport',
    spanClass: '',
  },
  {
    group: 'fixos',
    label: 'Gastos fixos',
    icon: Repeat2,
    cardClass: 'group-card-fixos',
    badgeClass: 'bg-category-entertainment/15 text-category-entertainment',
    barClass: 'bg-category-entertainment',
    spanClass: '',
  },
  {
    group: 'parcelados',
    label: 'Parcelados',
    icon: CreditCard,
    cardClass: 'group-card-parcelados',
    badgeClass: 'bg-category-shopping/15 text-category-shopping',
    barClass: 'bg-category-shopping',
    spanClass: 'lg:col-span-2',
  },
] as const;

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
  const [chartOpen, setChartOpen] = useState(false);
  const [commitmentsOpen, setCommitmentsOpen] = useState(false);

  const todayCycle = getFinancialCycle().id;
  const realized = domain.state.cycles[cycleId] ?? [];
  const projected = cycleId > todayCycle
    ? plannedCommitments(domain.state, cycleId).filter(item => !realized.some(value => value.definitionId === item.definitionId))
    : [];
  const categoryBreakdown = computeCategoryBreakdown(domain.state, cycleId);
  const categoryTotal = categoryBreakdown.reduce((sum, item) => sum + item.amount, 0);

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
          <ExpenseCatalogs domain={domain} />
        </div>
      </div>

      {domain.readOnly && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível recuperar as despesas. Os dados originais foram preservados; alterações estão suspensas.
        </div>
      )}

      {/* Cards por Grupo Orçamentário (2 colunas no desktop, com cores sutis por grupo) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {areas.map(({ group, label, icon: Icon, cardClass, badgeClass, barClass, spanClass }) => {
          const items = [...realized, ...projected]
            .filter(item => item.group === group)
            .sort((a, b) => b.date.localeCompare(a.date));
          const total = realized.filter(item => item.group === group).reduce((sum, value) => sum + value.amount, 0);
          const forecast = projected.filter(item => item.group === group).reduce((sum, value) => sum + value.amount, 0);
          const groupGoal = subgoals?.[group]?.amount ?? 0;
          const groupRatio = groupGoal > 0 ? Math.min(100, Math.round((total / groupGoal) * 100)) : 0;
          const isOverGroupGoal = groupGoal > 0 && total > groupGoal;
          const isNearGroupGoal = !isOverGroupGoal && groupGoal > 0 && groupRatio >= 85;
          const isManualGroup = group === 'carro' || group === 'casa' || group === 'diarias';

          return (
            <section
              key={group}
              aria-label={`${label} do ciclo`}
              className={`overflow-hidden rounded-2xl border shadow-card transition-shadow hover:shadow-card-hover ${cardClass} ${spanClass}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${badgeClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold">{label}</h3>
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
                              isOverGroupGoal ? 'bg-destructive' : isNearGroupGoal ? 'bg-warning' : barClass
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

                {isManualGroup ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-card/85 hover:bg-card"
                    disabled={domain.readOnly}
                    onClick={() => onAdd(group)}
                    aria-label={`Adicionar despesa em ${label}`}
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
                    aria-label={`Gerenciar ${label}`}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {group === 'fixos' ? 'Recorrente' : 'Parcelamento'}
                  </Button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="px-5 py-6 text-center text-xs text-muted-foreground">
                  Nenhum lançamento registrado em <strong className="font-medium text-foreground">{label}</strong> neste ciclo.
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
                              if (item.nature !== 'avulso') setCorrection({ item, amount: item.amount });
                              else if (isManualGroup) onEdit(item);
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