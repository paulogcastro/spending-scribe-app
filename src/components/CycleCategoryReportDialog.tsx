import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  FilterX,
  Minus,
  PieChart,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { computeCycleReport, type CategoryReportItem } from '@/lib/cycleOverview';
import {
  getBudgetGroupsMap,
  getOrderedBudgetGroups,
  type ExpenseDomainState,
  type ExpenseNature,
} from '@/lib/expenseDomain';
import { formatCurrency } from '@/lib/format';

const DONUT_PALETTE = [
  { stroke: 'hsl(var(--primary))', dot: 'bg-primary' },
  { stroke: 'hsl(var(--category-transport))', dot: 'bg-category-transport' },
  { stroke: 'hsl(var(--warning))', dot: 'bg-warning' },
  { stroke: 'hsl(var(--category-entertainment))', dot: 'bg-category-entertainment' },
  { stroke: 'hsl(var(--category-shopping))', dot: 'bg-category-shopping' },
  { stroke: 'hsl(var(--category-health))', dot: 'bg-category-health' },
  { stroke: 'hsl(var(--investment))', dot: 'bg-investment' },
  { stroke: 'hsl(var(--category-other))', dot: 'bg-category-other' },
];

const NATURE_LABELS: Record<ExpenseNature, string> = {
  avulso: 'Avulso',
  recorrente: 'Recorrente',
  parcelado: 'Parcelado',
};

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function DeltaBadge({ deltaAmount, deltaPercent, previousAmount }: { deltaAmount: number; deltaPercent: number | null; previousAmount: number }) {
  if (previousAmount === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
        <Sparkles className="h-3 w-3" />
        Novo no ciclo
      </span>
    );
  }
  if (deltaAmount === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        <Minus className="h-3 w-3" />
        Estável (0%)
      </span>
    );
  }
  const increased = deltaAmount > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        increased
          ? 'bg-destructive/10 text-destructive'
          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      }`}
    >
      {increased ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {increased ? '+' : ''}
      {deltaPercent !== null ? `${deltaPercent}%` : formatCurrency(deltaAmount)}
    </span>
  );
}

interface CycleCategoryReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  periodLabel: string;
  domainState: ExpenseDomainState;
}

export function CycleCategoryReportDialog({
  open,
  onOpenChange,
  cycleId,
  periodLabel,
  domainState,
}: CycleCategoryReportDialogProps) {
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'categories' | 'payments'>('categories');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const orderedGroups = useMemo(() => getOrderedBudgetGroups(domainState), [domainState]);
  const groupsMap = useMemo(() => getBudgetGroupsMap(domainState), [domainState]);
  const paymentMethodsList = useMemo(
    () =>
      Object.values(domainState.paymentMethods)
        .filter((p) => p.active)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [domainState.paymentMethods]
  );

  const activeFilter = useMemo(
    () => ({
      groupId: groupFilter !== 'all' ? groupFilter : undefined,
      paymentMethodId: paymentFilter !== 'all' ? paymentFilter : undefined,
    }),
    [groupFilter, paymentFilter]
  );

  const report = useMemo(
    () => computeCycleReport(domainState, cycleId, activeFilter),
    [domainState, cycleId, activeFilter]
  );

  const selectedCategory: CategoryReportItem | null = useMemo(
    () => report.categories.find((c) => c.categoryId === selectedCategoryId) ?? null,
    [report.categories, selectedCategoryId]
  );

  const drilldownItems = useMemo(() => {
    if (!selectedCategory) return [];
    return (domainState.cycles[cycleId] ?? [])
      .filter((item) => {
        if (item.categoryId !== selectedCategory.categoryId) return false;
        if (activeFilter.groupId && item.group !== activeFilter.groupId) return false;
        if (activeFilter.paymentMethodId && item.paymentMethodId !== activeFilter.paymentMethodId) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [domainState.cycles, cycleId, selectedCategory, activeFilter]);

  const hasFilters = groupFilter !== 'all' || paymentFilter !== 'all';

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedCategoryId(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            {selectedCategory ? selectedCategory.name : 'Relatório do ciclo'}
          </DialogTitle>
          <DialogDescription>
            {periodLabel} · Lançamentos realizados no ciclo
          </DialogDescription>
        </DialogHeader>

        {/* Filtros por Grupo e Forma de Pagamento */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Select
              value={groupFilter}
              onValueChange={(value) => {
                setGroupFilter(value);
                setSelectedCategoryId(null);
              }}
            >
              <SelectTrigger aria-label="Filtrar por grupo orçamentário" className="h-9 text-xs">
                <SelectValue placeholder="Todos os grupos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {orderedGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={paymentFilter}
              onValueChange={(value) => {
                setPaymentFilter(value);
                setSelectedCategoryId(null);
              }}
            >
              <SelectTrigger aria-label="Filtrar por forma de pagamento" className="h-9 text-xs">
                <SelectValue placeholder="Todas as formas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as formas de pagamento</SelectItem>
                {paymentMethodsList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
                onClick={() => {
                  setGroupFilter('all');
                  setPaymentFilter('all');
                  setSelectedCategoryId(null);
                }}
              >
                <FilterX className="h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            </div>
          )}
        </div>

        {selectedCategory ? (
          /* Drill-down da categoria selecionada */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-secondary/35 p-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs"
                onClick={() => setSelectedCategoryId(null)}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para categorias
              </Button>
              <div className="flex items-center gap-2">
                <DeltaBadge
                  deltaAmount={selectedCategory.deltaAmount}
                  deltaPercent={selectedCategory.deltaPercent}
                  previousAmount={selectedCategory.previousAmount}
                />
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatCurrency(selectedCategory.amount)}
                </span>
              </div>
            </div>

            <div className="divide-y divide-border rounded-xl border border-border">
              {drilldownItems.map((item) => {
                const groupName = groupsMap[item.group]?.name ?? item.group;
                const paymentName = domainState.paymentMethods[item.paymentMethodId]?.name ?? 'Sem forma';
                return (
                  <div key={item.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium text-foreground">{item.description}</p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>{formatShortDate(item.date)}</span>
                        <span>·</span>
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                          {groupName}
                        </Badge>
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
                          {paymentName}
                        </Badge>
                        <span className="text-[10px]">{NATURE_LABELS[item.nature]}</span>
                      </div>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-foreground">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Visão consolidada */
          <div className="space-y-4">
            {/* Resumo comparativo */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">Total no recorte</p>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {formatCurrency(report.total)}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {report.count} {report.count === 1 ? 'lançamento' : 'lançamentos'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">Vs. ciclo anterior</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {report.previousTotal > 0 ? formatCurrency(report.previousTotal) : 'Sem base'}
                  </span>
                  <DeltaBadge
                    deltaAmount={report.deltaAmount}
                    deltaPercent={report.deltaPercent}
                    previousAmount={report.previousTotal}
                  />
                </div>
              </div>
            </div>

            {/* Alternância: Por Categoria vs Por Forma de Pagamento */}
            <div className="grid grid-cols-2 rounded-xl border border-border bg-secondary/40 p-1">
              <button
                type="button"
                onClick={() => setViewMode('categories')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'categories'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <PieChart className="h-3.5 w-3.5" />
                Por categoria
              </button>
              <button
                type="button"
                onClick={() => setViewMode('payments')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'payments'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                Por pagamento
              </button>
            </div>

            {report.count === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                Nenhum lançamento encontrado para este filtro no ciclo.
              </p>
            ) : viewMode === 'categories' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center py-1">
                  <div className="relative flex items-center justify-center">
                    <svg width="168" height="168" viewBox="0 0 42 42" className="-rotate-90" role="img" aria-label="Gráfico de gastos por categoria">
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="hsl(var(--secondary))" strokeWidth="5" />
                      {(() => {
                        let offset = 0;
                        return report.categories.map((entry, index) => {
                          const pct = report.total > 0 ? (entry.amount / report.total) * 100 : 0;
                          const currentOffset = offset;
                          offset += pct;
                          return (
                            <circle
                              key={entry.categoryId}
                              cx="21"
                              cy="21"
                              r="15.915"
                              fill="transparent"
                              stroke={DONUT_PALETTE[index % DONUT_PALETTE.length].stroke}
                              strokeWidth="5"
                              strokeDasharray={`${pct} ${100 - pct}`}
                              strokeDashoffset={-currentOffset}
                              className="cursor-pointer transition-opacity hover:opacity-80"
                              onClick={() => setSelectedCategoryId(entry.categoryId)}
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div className="pointer-events-none absolute text-center">
                      <p className="text-[11px] text-muted-foreground">Total</p>
                      <p className="text-sm font-bold tabular-nums">{formatCurrency(report.total)}</p>
                    </div>
                  </div>
                </div>

                <p className="text-center text-[11px] text-muted-foreground">
                  Toque em uma categoria para ver os lançamentos
                </p>

                <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                  {report.categories.map((entry, index) => (
                    <button
                      key={entry.categoryId}
                      type="button"
                      onClick={() => setSelectedCategoryId(entry.categoryId)}
                      className="flex w-full items-center justify-between gap-2 p-2.5 text-left text-xs transition-colors hover:bg-secondary/50"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DONUT_PALETTE[index % DONUT_PALETTE.length].dot}`} />
                          <span className="truncate font-semibold text-foreground">{entry.name}</span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">({entry.count}x)</span>
                        </div>
                        <DeltaBadge
                          deltaAmount={entry.deltaAmount}
                          deltaPercent={entry.deltaPercent}
                          previousAmount={entry.previousAmount}
                        />
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <div className="text-right tabular-nums">
                          <p className="font-semibold text-foreground">{formatCurrency(entry.amount)}</p>
                          <p className="text-[11px] text-muted-foreground">{entry.percent}%</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-border p-3">
                {report.paymentMethods.map((pm) => (
                  <div key={pm.paymentMethodId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-semibold text-foreground">
                        {pm.name} <span className="font-normal text-muted-foreground">({pm.count}x)</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        <strong className="font-semibold text-foreground">{formatCurrency(pm.amount)}</strong> ({pm.percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, Math.max(2, pm.percent))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
