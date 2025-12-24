import { useState, useMemo } from 'react';
import { useExpenses } from '@/hooks/useExpenses';
import { ExpenseForm } from '@/components/ExpenseForm';
import { ExpenseList } from '@/components/ExpenseList';
import { ExpenseChart } from '@/components/ExpenseChart';
import { MonthSelector } from '@/components/MonthSelector';
import { SummaryCards } from '@/components/SummaryCards';
import { Wallet } from 'lucide-react';

const Index = () => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const {
    addExpense,
    removeExpense,
    getExpensesByMonth,
    getTotalByCategory,
    getTotal,
  } = useExpenses();

  const monthlyExpenses = useMemo(
    () => getExpensesByMonth(selectedYear, selectedMonth),
    [getExpensesByMonth, selectedYear, selectedMonth]
  );

  const categoryTotals = useMemo(
    () => getTotalByCategory(monthlyExpenses),
    [getTotalByCategory, monthlyExpenses]
  );

  const total = useMemo(
    () => getTotal(monthlyExpenses),
    [getTotal, monthlyExpenses]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Meus Gastos</h1>
              <p className="text-sm text-muted-foreground">
                Controle suas finanças de forma simples
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Add Expense Form */}
            <section className="rounded-xl border border-border bg-card p-6 shadow-card animate-fade-in">
              <h2 className="text-lg font-semibold mb-4">Novo Gasto</h2>
              <ExpenseForm onSubmit={addExpense} />
            </section>

            {/* Month Selector & Expense List */}
            <section className="space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Histórico</h2>
                <MonthSelector
                  year={selectedYear}
                  month={selectedMonth}
                  onChange={(y, m) => {
                    setSelectedYear(y);
                    setSelectedMonth(m);
                  }}
                />
              </div>
              <ExpenseList
                expenses={monthlyExpenses}
                onRemove={removeExpense}
              />
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <SummaryCards total={total} categoryTotals={categoryTotals} />
            
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Distribuição por Categoria
              </h3>
              <ExpenseChart data={categoryTotals} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Index;
