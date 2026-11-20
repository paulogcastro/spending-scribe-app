import { useMemo, useCallback } from 'react';
import { useFinances } from '@/hooks/useFinances';
import { useFinancialCycles } from '@/hooks/useFinancialCycles';
import { CycleSelector } from '@/components/CycleSelector';
import { CyclePlanningSection } from '@/components/CyclePlanningSection';
import { financialPeriods } from '@/lib/financialPeriods';
import { useCyclePlanning } from '@/hooks/useCyclePlanning';
import { InvestmentSection } from '@/components/InvestmentSection';
import { FixedExpenseSection } from '@/components/FixedExpenseSection';
import { InstallmentSection } from '@/components/InstallmentSection';
import { DailyExpenseSection } from '@/components/DailyExpenseSection';
import { SummaryPanel } from '@/components/SummaryPanel';
import { Wallet, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ExpenseGoals } from '@/types/finance';
import { BudgetOverview } from '@/components/BudgetOverview';
import { BackupControls } from '@/components/BackupControls';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const Index = () => {
  const { cycle, navigate } = useFinancialCycles();
  const periods = financialPeriods(cycle.id);
  const { year: selectedYear, month: selectedMonth } = periods.monthly;
  const cyclePlanning = useCyclePlanning(cycle.id);
  const cycleInvestmentGoal = cyclePlanning.derived.totalInvestmentGoal;
  const {
    exportBackup,
    restoreBackup,
    getMonthData,
    reorderItems,
    addInvestment,
    updateInvestment,
    removeInvestment,
    setExpenseGoal,
    addFixedExpense,
    updateFixedExpense,
    removeFixedExpense,
    addInstallment,
    updateInstallment,
    removeInstallment,
    addDailyExpense,
    updateDailyExpense,
    removeDailyExpense,
    getMonthSummary,
    copyToNextMonth
  } = useFinances();

  const monthData = useMemo(() => getMonthData(selectedYear, selectedMonth), [getMonthData, selectedYear, selectedMonth]);
  const summary = useMemo(() => getMonthSummary(selectedYear, selectedMonth), [getMonthSummary, selectedYear, selectedMonth]);

  // Handlers com year/month encapsulados

  const handleAddInvestment = useCallback((item: Parameters<typeof addInvestment>[2]) => addInvestment(selectedYear, selectedMonth, item), [addInvestment, selectedYear, selectedMonth]);
  const handleUpdateInvestment = useCallback((id: string, updates: Parameters<typeof updateInvestment>[3]) => updateInvestment(selectedYear, selectedMonth, id, updates), [updateInvestment, selectedYear, selectedMonth]);
  const handleRemoveInvestment = useCallback((id: string) => removeInvestment(selectedYear, selectedMonth, id), [removeInvestment, selectedYear, selectedMonth]);
  const handleReorderInvestment = useCallback((newOrder: string[]) => reorderItems(selectedYear, selectedMonth, 'investments', newOrder), [reorderItems, selectedYear, selectedMonth]);

  const handleExpenseGoalChange = useCallback((group: keyof ExpenseGoals, value: number) => setExpenseGoal(selectedYear, selectedMonth, group, value), [setExpenseGoal, selectedYear, selectedMonth]);

  const handleAddFixedCasa = useCallback((item: Parameters<typeof addFixedExpense>[3]) => addFixedExpense(selectedYear, selectedMonth, 'casa', item), [addFixedExpense, selectedYear, selectedMonth]);
  const handleUpdateFixedCasa = useCallback((id: string, updates: Parameters<typeof updateFixedExpense>[4]) => updateFixedExpense(selectedYear, selectedMonth, 'casa', id, updates), [updateFixedExpense, selectedYear, selectedMonth]);
  const handleRemoveFixedCasa = useCallback((id: string) => removeFixedExpense(selectedYear, selectedMonth, 'casa', id), [removeFixedExpense, selectedYear, selectedMonth]);
  const handleReorderFixedCasa = useCallback((newOrder: string[]) => reorderItems(selectedYear, selectedMonth, 'casa', newOrder), [reorderItems, selectedYear, selectedMonth]);

  const handleAddFixedCarro = useCallback((item: Parameters<typeof addFixedExpense>[3]) => addFixedExpense(selectedYear, selectedMonth, 'carro', item), [addFixedExpense, selectedYear, selectedMonth]);
  const handleUpdateFixedCarro = useCallback((id: string, updates: Parameters<typeof updateFixedExpense>[4]) => updateFixedExpense(selectedYear, selectedMonth, 'carro', id, updates), [updateFixedExpense, selectedYear, selectedMonth]);
  const handleRemoveFixedCarro = useCallback((id: string) => removeFixedExpense(selectedYear, selectedMonth, 'carro', id), [removeFixedExpense, selectedYear, selectedMonth]);
  const handleReorderFixedCarro = useCallback((newOrder: string[]) => reorderItems(selectedYear, selectedMonth, 'carro', newOrder), [reorderItems, selectedYear, selectedMonth]);

  const handleAddInstallment = useCallback((item: Parameters<typeof addInstallment>[2]) => addInstallment(selectedYear, selectedMonth, item), [addInstallment, selectedYear, selectedMonth]);
  const handleUpdateInstallment = useCallback((id: string, updates: Parameters<typeof updateInstallment>[3]) => updateInstallment(selectedYear, selectedMonth, id, updates), [updateInstallment, selectedYear, selectedMonth]);
  const handleRemoveInstallment = useCallback((id: string) => removeInstallment(selectedYear, selectedMonth, id), [removeInstallment, selectedYear, selectedMonth]);
  const handleReorderInstallment = useCallback((newOrder: string[]) => reorderItems(selectedYear, selectedMonth, 'parcelados', newOrder), [reorderItems, selectedYear, selectedMonth]);

  const handleAddDaily = useCallback((expense: Parameters<typeof addDailyExpense>[2]) => addDailyExpense(selectedYear, selectedMonth, expense), [addDailyExpense, selectedYear, selectedMonth]);
  const handleUpdateDaily = useCallback((id: string, updates: Parameters<typeof updateDailyExpense>[3]) => updateDailyExpense(selectedYear, selectedMonth, id, updates), [updateDailyExpense, selectedYear, selectedMonth]);
  const handleRemoveDaily = useCallback((id: string) => removeDailyExpense(selectedYear, selectedMonth, id), [removeDailyExpense, selectedYear, selectedMonth]);
  const handleReorderDaily = useCallback((newOrder: string[]) => reorderItems(selectedYear, selectedMonth, 'diarias', newOrder), [reorderItems, selectedYear, selectedMonth]);

  const handleCopyToNextMonth = () => {
    copyToNextMonth(selectedYear, selectedMonth);
    toast.success('Cópia mensal legada concluída para o próximo mês civil.');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Controle de Gastos</h1>
                <p className="text-sm text-muted-foreground">
                  Finanças pessoais
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CycleSelector cycle={cycle} onNavigate={navigate} />
              <Button variant="outline" size="sm" onClick={handleCopyToNextMonth} className="gap-2" aria-label="Cópia mensal legada para o próximo mês civil" title={`Cópia mensal legada para o próximo mês civil · ${periods.monthly.label}`}>
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Copiar mês legado</span>
              </Button>
              <BackupControls exportBackup={exportBackup} restoreBackup={restoreBackup} />
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <h2 className="text-sm font-medium text-muted-foreground">Registros mensais — {periods.monthly.label}</h2>
        <BudgetOverview monthlyPeriodLabel={periods.monthly.label} income={summary.incomeActual} expenses={summary.expensesActual} investments={summary.investmentsTotal} expenseGoal={summary.expensesPlanned} dailyGoal={monthData.expenseGoals?.diarias || 0} dailySpent={summary.diariasTotal} year={selectedYear} month={selectedMonth} />
        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList className="w-full sm:w-auto h-auto grid grid-cols-3 p-1">
            <TabsTrigger value="daily" className="text-xs sm:text-sm">Despesas diárias</TabsTrigger>
            <TabsTrigger value="planning" className="text-xs sm:text-sm">Planejamento</TabsTrigger>
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Resumo e gráficos</TabsTrigger>
          </TabsList>
          <TabsContent value="planning" className="space-y-6">
            {/* Cycle-based planning (Bloco 2): independente do armazenamento mensal legado */}
            <CyclePlanningSection cycleId={cycle.id} cyclePlanning={cyclePlanning} />

            {/* Income & Investments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="legacy-investments">
              <InvestmentSection
                monthlyPeriodLabel={periods.monthly.label}
                cyclePeriodLabel={periods.cycle.label}
                items={monthData.investments || []}
                goal={cycleInvestmentGoal}
                onAdd={handleAddInvestment}
                onUpdate={handleUpdateInvestment}
                onRemove={handleRemoveInvestment}
                onReorder={handleReorderInvestment}
              />
            </div>

            {/* Fixed Expenses - Casa */}
            <h3 className="text-sm font-medium text-muted-foreground">Despesas e metas mensais — {periods.monthly.label}</h3>
            <div className="grid gap-6">
              <FixedExpenseSection
                title="Casa"
                type="casa"
                items={monthData.casa}
                goal={monthData.expenseGoals?.casa || 0}
                onGoalChange={value => handleExpenseGoalChange('casa', value)}
                onAdd={handleAddFixedCasa}
                onUpdate={handleUpdateFixedCasa}
                onRemove={handleRemoveFixedCasa}
                onReorder={handleReorderFixedCasa}
              />
            </div>

            {/* Fixed Expenses - Carro */}
            <div className="grid gap-6">
              <FixedExpenseSection
                title="Carro"
                type="carro"
                items={monthData.carro}
                goal={monthData.expenseGoals?.carro || 0}
                onGoalChange={value => handleExpenseGoalChange('carro', value)}
                onAdd={handleAddFixedCarro}
                onUpdate={handleUpdateFixedCarro}
                onRemove={handleRemoveFixedCarro}
                onReorder={handleReorderFixedCarro}
              />
            </div>

            {/* Installments */}
            <InstallmentSection
              items={monthData.parcelados}
              goal={monthData.expenseGoals?.parcelados || 0}
              onGoalChange={value => handleExpenseGoalChange('parcelados', value)}
              onAdd={handleAddInstallment}
              onUpdate={handleUpdateInstallment}
              onRemove={handleRemoveInstallment}
              onReorder={handleReorderInstallment}
            />

          </TabsContent>
          <TabsContent value="daily">
            <p className="mb-4 text-sm text-muted-foreground">Despesas e meta mensal — {periods.monthly.label}</p>
            {/* Daily Expenses */}
            <DailyExpenseSection
              items={monthData.diarias}
              goal={monthData.expenseGoals?.diarias || 0}
              onGoalChange={value => handleExpenseGoalChange('diarias', value)}
              onAdd={handleAddDaily}
              onUpdate={handleUpdateDaily}
              onRemove={handleRemoveDaily}
              onReorder={handleReorderDaily}
            />
          </TabsContent>
          <TabsContent value="overview">
              <SummaryPanel
                monthlyPeriodLabel={periods.monthly.label}
                cyclePeriodLabel={periods.cycle.label}
                expensesPlanned={summary.expensesPlanned}
                expensesActual={summary.expensesActual}
                casaActual={summary.casaActual}
                carroActual={summary.carroActual}
                parceladosActual={summary.parceladosActual}
                diariasTotal={summary.diariasTotal}
                incomeActual={summary.incomeActual}
                investmentsTotal={summary.investmentsTotal}
                investmentGoal={cycleInvestmentGoal}
                result={summary.result}
                expenseGoals={summary.expenseGoals}
                expensesByCategory={summary.expensesByCategory}
                dailyExpenses={monthData.diarias}
              />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
