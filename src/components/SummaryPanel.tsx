import { formatCurrency } from '@/lib/format';
import { TrendingUp, TrendingDown, Wallet, Home, Car, CreditCard, Receipt } from 'lucide-react';

interface SummaryPanelProps {
  incomePlanned: number;
  incomeActual: number;
  expensesPlanned: number;
  expensesActual: number;
  casaActual: number;
  carroActual: number;
  parceladosValue: number;
  diariasTotal: number;
  result: number;
}

export function SummaryPanel({
  incomePlanned,
  incomeActual,
  expensesPlanned,
  expensesActual,
  casaActual,
  carroActual,
  parceladosValue,
  diariasTotal,
  result,
}: SummaryPanelProps) {
  const isPositive = result >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Wallet className="h-4 w-4" />
        Resumo
      </h3>

      <div className="space-y-4">
        {/* Main summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Planejado</div>
            <div className="text-sm font-semibold">{formatCurrency(incomePlanned)}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Atual</div>
            <div className="text-sm font-semibold">{formatCurrency(incomeActual)}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Diferença</div>
            <div className={`text-sm font-semibold ${incomeActual - incomePlanned >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(incomeActual - incomePlanned)}
            </div>
          </div>
        </div>

        {/* Income vs Expenses */}
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>Renda Total</span>
            </div>
            <div className="text-sm font-medium">{formatCurrency(incomeActual)}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span>Despesas Totais</span>
            </div>
            <div className="text-sm font-medium">{formatCurrency(expensesActual)}</div>
          </div>
        </div>

        {/* Result */}
        <div className={`p-4 rounded-lg ${isPositive ? 'bg-primary/10' : 'bg-destructive/10'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Resultado</span>
            <span className={`text-lg font-bold ${isPositive ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(result)}
            </span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 pt-3 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Despesas por Grupo</div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Home className="h-3 w-3 text-blue-500" />
              <span>Casa</span>
            </div>
            <span>{formatCurrency(casaActual)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Car className="h-3 w-3 text-orange-500" />
              <span>Carro</span>
            </div>
            <span>{formatCurrency(carroActual)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-3 w-3 text-purple-500" />
              <span>Parcelados</span>
            </div>
            <span>{formatCurrency(parceladosValue)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Receipt className="h-3 w-3 text-amber-500" />
              <span>Diárias</span>
            </div>
            <span>{formatCurrency(diariasTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
