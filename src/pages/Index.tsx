import { useState, useMemo, useCallback } from 'react';
import { useFinances } from '@/hooks/useFinances';
import { MonthSelector } from '@/components/MonthSelector';
import { IncomeSection } from '@/components/IncomeSection';
import { InvestmentSection } from '@/components/InvestmentSection';
import { FixedExpenseSection } from '@/components/FixedExpenseSection';
import { InstallmentSection } from '@/components/InstallmentSection';
import { DailyExpenseSection } from '@/components/DailyExpenseSection';
import { SummaryPanel } from '@/components/SummaryPanel';
import { Wallet, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ExpenseGoals } from '@/types/finance';

const Index = () => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [dailyBudget, setDailyBudget] = useState(0);

  const {
    getMonthData,
    addIncome,
    updateIncome,
    removeIncome,
    addInvestment,
    updateInvestment,
    removeInvestment,
    setInvestmentGoal,
    setExpenseGoal,
    addFixedExpense,
    updateFixedExpense,
    removeFixedExpense,
    addInstallment,
    updateInstallment,
    removeInstallment,
    addDailyExpense,
    removeDailyExpense,
    getMonthSummary,
    copyToNextMonth,
  } = useFinances();

  const monthData = useMemo(
    () => getMonthData(selectedYear, selectedMonth),
    [getMonthData, selectedYear, selectedMonth]
  );

  const summary = useMemo(
    () => getMonthSummary(selectedYear, selectedMonth),
    [getMonthSummary, selectedYear, selectedMonth]
  );

  // Handlers com year/month encapsulados
  const handleAddIncome = useCallback(
    (item: Parameters<typeof addIncome>[2]) => addIncome(selectedYear, selectedMonth, item),
    [addIncome, selectedYear, selectedMonth]
  );

  const handleUpdateIncome = useCallback(
    (id: string, updates: Parameters<typeof updateIncome>[3]) => updateIncome(selectedYear, selectedMonth, id, updates),
    [updateIncome, selectedYear, selectedMonth]
  );

  const handleRemoveIncome = useCallback(
    (id: string) => removeIncome(selectedYear, selectedMonth, id),
    [removeIncome, selectedYear, selectedMonth]
  );

  const handleAddInvestment = useCallback(
    (item: Parameters<typeof addInvestment>[2]) => addInvestment(selectedYear, selectedMonth, item),
    [addInvestment, selectedYear, selectedMonth]
  );

  const handleUpdateInvestment = useCallback(
    (id: string, updates: Parameters<typeof updateInvestment>[3]) => updateInvestment(selectedYear, selectedMonth, id, updates),
    [updateInvestment, selectedYear, selectedMonth]
  );

  const handleRemoveInvestment = useCallback(
    (id: string) => removeInvestment(selectedYear, selectedMonth, id),
    [removeInvestment, selectedYear, selectedMonth]
  );

  const handleInvestmentGoalChange = useCallback(
    (value: number) => setInvestmentGoal(selectedYear, selectedMonth, value),
    [setInvestmentGoal, selectedYear, selectedMonth]
  );

  const handleExpenseGoalChange = useCallback(
    (group: keyof ExpenseGoals, value: number) => setExpenseGoal(selectedYear, selectedMonth, group, value),
    [setExpenseGoal, selectedYear, selectedMonth]
  );

  const handleAddFixedCasa = useCallback(
    (item: Parameters<typeof addFixedExpense>[3]) => addFixedExpense(selectedYear, selectedMonth, 'casa', item),
    [addFixedExpense, selectedYear, selectedMonth]
  );

  const handleUpdateFixedCasa = useCallback(
    (id: string, updates: Parameters<typeof updateFixedExpense>[4]) => updateFixedExpense(selectedYear, selectedMonth, 'casa', id, updates),
    [updateFixedExpense, selectedYear, selectedMonth]
  );

  const handleRemoveFixedCasa = useCallback(
    (id: string) => removeFixedExpense(selectedYear, selectedMonth, 'casa', id),
    [removeFixedExpense, selectedYear, selectedMonth]
  );

  const handleAddFixedCarro = useCallback(
    (item: Parameters<typeof addFixedExpense>[3]) => addFixedExpense(selectedYear, selectedMonth, 'carro', item),
    [addFixedExpense, selectedYear, selectedMonth]
  );

  const handleUpdateFixedCarro = useCallback(
    (id: string, updates: Parameters<typeof updateFixedExpense>[4]) => updateFixedExpense(selectedYear, selectedMonth, 'carro', id, updates),
    [updateFixedExpense, selectedYear, selectedMonth]
  );

  const handleRemoveFixedCarro = useCallback(
    (id: string) => removeFixedExpense(selectedYear, selectedMonth, 'carro', id),
    [removeFixedExpense, selectedYear, selectedMonth]
  );

  const handleAddInstallment = useCallback(
    (item: Parameters<typeof addInstallment>[2]) => addInstallment(selectedYear, selectedMonth, item),
    [addInstallment, selectedYear, selectedMonth]
  );

  const handleUpdateInstallment = useCallback(
    (id: string, updates: Parameters<typeof updateInstallment>[3]) => updateInstallment(selectedYear, selectedMonth, id, updates),
    [updateInstallment, selectedYear, selectedMonth]
  );

  const handleRemoveInstallment = useCallback(
    (id: string) => removeInstallment(selectedYear, selectedMonth, id),
    [removeInstallment, selectedYear, selectedMonth]
  );

  const handleAddDaily = useCallback(
    (expense: Parameters<typeof addDailyExpense>[2]) => addDailyExpense(selectedYear, selectedMonth, expense),
    [addDailyExpense, selectedYear, selectedMonth]
  );

  const handleRemoveDaily = useCallback(
    (id: string) => removeDailyExpense(selectedYear, selectedMonth, id),
    [removeDailyExpense, selectedYear, selectedMonth]
  );

  const handleCopyToNextMonth = () => {
    copyToNextMonth(selectedYear, selectedMonth);
    toast.success('Dados copiados para o próximo mês!');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Planilha Financeira</h1>
                <p className="text-sm text-muted-foreground">
                  Controle completo das suas finanças
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MonthSelector
                year={selectedYear}
                month={selectedMonth}
                onChange={(y, m) => {
                  setSelectedYear(y);
                  setSelectedMonth(m);
                }}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyToNextMonth}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiar para próximo mês
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Income & Investments */}
            <div className="flex gap-6">
              <IncomeSection
                items={monthData.income}
                onAdd={handleAddIncome}
                onUpdate={handleUpdateIncome}
                onRemove={handleRemoveIncome}
              />
              <InvestmentSection
                items={monthData.investments || []}
                onAdd={handleAddInvestment}
                onUpdate={handleUpdateInvestment}
                onRemove={handleRemoveInvestment}
              />
            </div>

            {/* Fixed Expenses - Casa & Carro */}
            <div className="grid gap-6 md:grid-cols-2">
              <FixedExpenseSection
                title="Casa"
                type="casa"
                items={monthData.casa}
                onAdd={handleAddFixedCasa}
                onUpdate={handleUpdateFixedCasa}
                onRemove={handleRemoveFixedCasa}
              />
              <FixedExpenseSection
                title="Carro"
                type="carro"
                items={monthData.carro}
                onAdd={handleAddFixedCarro}
                onUpdate={handleUpdateFixedCarro}
                onRemove={handleRemoveFixedCarro}
              />
            </div>

            {/* Installments */}
            <InstallmentSection
              items={monthData.parcelados}
              onAdd={handleAddInstallment}
              onUpdate={handleUpdateInstallment}
              onRemove={handleRemoveInstallment}
            />

            {/* Daily Expenses */}
            <DailyExpenseSection
              items={monthData.diarias}
              budgetPlanned={dailyBudget}
              onAdd={handleAddDaily}
              onRemove={handleRemoveDaily}
              onBudgetChange={setDailyBudget}
            />
          </div>

          {/* Right Column - Summary */}
          <aside className="space-y-6">
            <div className="sticky top-24">
              <SummaryPanel
                expensesPlanned={summary.expensesPlanned}
                expensesActual={summary.expensesActual}
                casaPlanned={summary.casaPlanned}
                casaActual={summary.casaActual}
                carroPlanned={summary.carroPlanned}
                carroActual={summary.carroActual}
                parceladosPlanned={summary.parceladosPlanned}
                parceladosActual={summary.parceladosActual}
                diariasTotal={summary.diariasTotal}
                diariasGoal={summary.diariasGoal}
                incomeActual={summary.incomeActual}
                investmentsTotal={summary.investmentsTotal}
                investmentGoal={summary.investmentGoal}
                result={summary.result}
                resultAfterInvestment={summary.resultAfterInvestment}
                expenseGoals={summary.expenseGoals}
                onInvestmentGoalChange={handleInvestmentGoalChange}
                onExpenseGoalChange={handleExpenseGoalChange}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Index;
