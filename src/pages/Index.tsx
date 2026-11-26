import { useMemo, useCallback, useState, useEffect } from 'react';
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
import { Wallet, Copy, MoreHorizontal, History, ArrowLeft, Receipt, Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ExpenseGoals } from '@/types/finance';
import { BudgetOverview } from '@/components/BudgetOverview';
import { BackupControls } from '@/components/BackupControls';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CycleExpenses } from '@/components/CycleExpenses';
import { CycleOverview } from '@/components/CycleOverview';
import { CycleExpenseDialog, type CycleExpenseEditor } from '@/components/CycleExpenseDialog';
import { useExpenseDomain } from '@/hooks/useExpenseDomain';
import { generateCycleCommitments, localExpenseDate, type ManualExpenseGroup, type ExpenseOccurrence } from '@/lib/expenseDomain';
import { getFinancialCycle } from '@/lib/financialCycles';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';

const Index = () => {
  const [showMonthly, setShowMonthly] = useState(false);
  const [expenseEditor, setExpenseEditor] = useState<CycleExpenseEditor | null>(null);
  const { cycle, navigate } = useFinancialCycles();
  const periods = financialPeriods(cycle.id);
  const { year: selectedYear, month: selectedMonth } = periods.monthly;
  const cyclePlanning = useCyclePlanning(cycle.id);
  const domain = useExpenseDomain();
  const { mutate: mutateDomain } = domain;
  const todayCycle = getFinancialCycle().id;
  useEffect(() => { mutateDomain(state => generateCycleCommitments(state, cycle.id, todayCycle)); }, [mutateDomain, cycle.id, todayCycle, domain.state]);
  const navigateCycle = (direction: -1 | 1) => { setExpenseEditor(null); navigate(direction); };
  const startExpense = (group: ManualExpenseGroup = 'diarias') => setExpenseEditor({ group, input: { description: '', amount: 0, categoryId: '', paymentMethodId: '', date: localExpenseDate(), note: '' } });
  const editExpense = (item: ExpenseOccurrence) => {
    if (item.nature !== 'avulso' || (item.group !== 'carro' && item.group !== 'casa' && item.group !== 'diarias')) return;
    setExpenseEditor({ group: item.group, id: item.id, input: { description: item.description, amount: item.amount, categoryId: item.categoryId, paymentMethodId: item.paymentMethodId, date: item.date, note: item.note ?? '' } });
  };
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
    toast.success('Registros mensais copiados para o próximo mês.');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold tracking-tight sm:text-lg">Spending Scribe</h1>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Por ciclos
                  </span>
                </div>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Controle de gastos pessoais
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ThemeToggle />
              <BackupControls exportBackup={exportBackup} restoreBackup={restoreBackup} />
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Mais opções" title="Mais opções"><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setShowMonthly(true)}><History className="mr-2 h-4 w-4" />Controle mensal anterior</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-background/90 py-3 backdrop-blur-sm">
          <CycleSelector cycle={cycle} onNavigate={navigateCycle} />
          {!showMonthly && <Button className="h-11 w-full gap-2 rounded-xl shadow-sm sm:w-auto" disabled={domain.readOnly} onClick={() => startExpense()}><Plus className="h-4 w-4" />Nova despesa</Button>}
        </div>
        {!showMonthly ? <>
        <CycleOverview planning={cyclePlanning.planning} domain={domain.state} periodLabel={periods.cycle.label} readOnly={cyclePlanning.readOnly || domain.readOnly} />
        <Tabs key="cycle" defaultValue="cycle-expenses" className="space-y-5">
          <TabsList aria-label="Controle por ciclo" className="cycle-tabs">
            <TabsTrigger value="cycle-expenses" className="gap-2"><Receipt className="h-4 w-4" />Despesas</TabsTrigger>
            <TabsTrigger value="planning" className="gap-2"><Target className="h-4 w-4" />Planejamento</TabsTrigger>
          </TabsList>
          <TabsContent value="cycle-expenses"><CycleExpenses key={cycle.id} cycleId={cycle.id} periodLabel={periods.cycle.label} domain={domain} subgoals={cyclePlanning.derived.subgoals} onAdd={startExpense} onEdit={editExpense} /></TabsContent>
          <TabsContent value="planning"><CyclePlanningSection key={cycle.id} cycleId={cycle.id} cyclePlanning={cyclePlanning} /></TabsContent>
        </Tabs></> : <section aria-label="Controle mensal anterior" className="space-y-6">
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => setShowMonthly(false)}><ArrowLeft className="h-4 w-4" />Voltar ao controle por ciclo</Button>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Controle mensal anterior</h2><p className="mt-1 text-sm text-muted-foreground">{periods.monthly.label}</p></div><Button variant="outline" size="sm" onClick={handleCopyToNextMonth} className="gap-2" title="Copiar os registros deste mês para o próximo"><Copy className="h-4 w-4" />Copiar mês</Button></div>
            <p className="border-l-2 border-border pl-3 text-sm text-muted-foreground">Estes registros pertencem ao controle anterior e são separados das despesas e do planejamento por ciclo.</p>
          </div>
        <BudgetOverview monthlyPeriodLabel={periods.monthly.label} income={summary.incomeActual} expenses={summary.expensesActual} investments={summary.investmentsTotal} expenseGoal={summary.expensesPlanned} dailyGoal={monthData.expenseGoals?.diarias || 0} dailySpent={summary.diariasTotal} year={selectedYear} month={selectedMonth} />
        <Tabs key="monthly" defaultValue="daily" className="space-y-6">
          <TabsList aria-label="Controle mensal anterior" className="w-full sm:w-auto min-h-12 h-auto grid grid-cols-3 p-1">
            <TabsTrigger value="daily" className="h-full whitespace-normal text-xs sm:text-sm">Despesas diárias</TabsTrigger>
            <TabsTrigger value="planning" className="h-full whitespace-normal text-xs sm:text-sm">Despesas e investimentos</TabsTrigger>
            <TabsTrigger value="overview" className="h-full whitespace-normal text-xs sm:text-sm">Resumo e gráficos</TabsTrigger>
          </TabsList>
          <TabsContent value="planning" className="space-y-6">
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
        </section>}
      </main>
      <CycleExpenseDialog key={cycle.id} editor={expenseEditor} onChange={setExpenseEditor} onClose={() => setExpenseEditor(null)} cycleId={cycle.id} periodLabel={periods.cycle.label} domain={domain} />
    </div>
  );
};

export default Index;
