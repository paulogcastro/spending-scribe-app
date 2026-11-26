import { useMemo, useState, useEffect } from 'react';
import { useFinances } from '@/hooks/useFinances';
import { useFinancialCycles } from '@/hooks/useFinancialCycles';
import { CycleSelector } from '@/components/CycleSelector';
import { CyclePlanningSection } from '@/components/CyclePlanningSection';
import { financialPeriods } from '@/lib/financialPeriods';
import { useCyclePlanning } from '@/hooks/useCyclePlanning';
import { Receipt, Target, Plus, Settings2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CycleExpenses } from '@/components/CycleExpenses';
import { CycleOverview } from '@/components/CycleOverview';
import { SettingsSection } from '@/components/SettingsSection';
import { CycleExpenseDialog, type CycleExpenseEditor } from '@/components/CycleExpenseDialog';
import { useExpenseDomain } from '@/hooks/useExpenseDomain';
import {
  generateCycleCommitments,
  getBudgetGroupsMap,
  getOrderedBudgetGroups,
  isExpenseNatureCompatible,
  localExpenseDate,
  type ManualExpenseGroup,
  type ExpenseOccurrence,
} from '@/lib/expenseDomain';
import { computeCycleOverview } from '@/lib/cycleOverview';
import { getFinancialCycle } from '@/lib/financialCycles';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthControls } from '@/components/AuthControls';
import { AuthGateScreen } from '@/components/AuthGateScreen';
import { BrandLogo } from '@/components/BrandLogo';
import { InstallAppButton } from '@/components/InstallAppButton';
import { useCloudAuth } from '@/hooks/useCloudAuth';

const Index = () => {
  const [expenseEditor, setExpenseEditor] = useState<CycleExpenseEditor | null>(null);
  const { cycle, navigate } = useFinancialCycles();
  const periods = financialPeriods(cycle.id);
  const cyclePlanning = useCyclePlanning(cycle.id);
  const domain = useExpenseDomain();
  const { mutate: mutateDomain } = domain;
  const syncTriggerKey = useMemo(
    () => JSON.stringify([cycle.id, cyclePlanning.plans, domain.state]),
    [cycle.id, cyclePlanning.plans, domain.state]
  );
  const cloudAuth = useCloudAuth(syncTriggerKey);
  const todayCycle = getFinancialCycle().id;
  useEffect(() => { mutateDomain(state => generateCycleCommitments(state, cycle.id, todayCycle)); }, [mutateDomain, cycle.id, todayCycle, domain.state]);

  const navigateCycle = (direction: -1 | 1) => { setExpenseEditor(null); navigate(direction); };
  const startExpense = (group: ManualExpenseGroup = 'diarias') => setExpenseEditor({ group, input: { description: '', amount: 0, categoryId: '', paymentMethodId: '', date: localExpenseDate(), note: '' } });
  const editExpense = (item: ExpenseOccurrence) => {
    const groupsMap = getBudgetGroupsMap(domain.state);
    if (item.nature !== 'avulso' || !isExpenseNatureCompatible(item.group, 'avulso', groupsMap)) return;
    setExpenseEditor({ group: item.group, id: item.id, input: { description: item.description, amount: item.amount, categoryId: item.categoryId, paymentMethodId: item.paymentMethodId, date: item.date, note: item.note ?? '' } });
  };

  const { exportBackup, restoreBackup } = useFinances();

  if (cloudAuth.isConfigured && cloudAuth.loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">Verificando sua sessão...</p>
      </div>
    );
  }

  if (cloudAuth.isConfigured && !cloudAuth.user) {
    return <AuthGateScreen auth={cloudAuth} />;
  }

  const overview = computeCycleOverview(cyclePlanning.planning, domain.state);
  const orderedGroups = getOrderedBudgetGroups(domain.state);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container py-3 sm:py-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <BrandLogo size="md" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">DinDin Flow</h1>
                  <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary min-[420px]:inline-flex">
                    Por ciclos
                  </span>
                </div>
                <p className="hidden text-xs text-muted-foreground sm:block sm:text-sm">
                  Controle de gastos pessoais
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <InstallAppButton />
              <AuthControls auth={cloudAuth} />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container space-y-5 py-4 sm:space-y-6 sm:py-6">
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-background/90 py-3 backdrop-blur-sm">
          <CycleSelector cycle={cycle} onNavigate={navigateCycle} />
          <Button className="h-11 w-full gap-2 rounded-xl shadow-sm sm:w-auto" disabled={domain.readOnly} onClick={() => startExpense()}>
            <Plus className="h-4 w-4" />
            Nova despesa
          </Button>
        </div>

        <CycleOverview
          planning={cyclePlanning.planning}
          domain={domain.state}
          periodLabel={periods.cycle.label}
          readOnly={cyclePlanning.readOnly || domain.readOnly}
        />

        <Tabs key="cycle" defaultValue="cycle-expenses" className="space-y-5">
          <TabsList aria-label="Controle por ciclo" className="cycle-tabs">
            <TabsTrigger value="cycle-expenses" className="gap-2"><Receipt className="h-4 w-4" />Despesas</TabsTrigger>
            <TabsTrigger value="planning" className="gap-2"><Target className="h-4 w-4" />Planejamento</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings2 className="h-4 w-4" />Configurações</TabsTrigger>
          </TabsList>
          <TabsContent value="cycle-expenses">
            <CycleExpenses
              key={cycle.id}
              cycleId={cycle.id}
              periodLabel={periods.cycle.label}
              domain={domain}
              subgoals={overview.subgoals}
              onAdd={startExpense}
              onEdit={editExpense}
            />
          </TabsContent>
          <TabsContent value="planning">
            <CyclePlanningSection
              key={cycle.id}
              cycleId={cycle.id}
              cyclePlanning={cyclePlanning}
              budgetGroups={orderedGroups}
              availableToInvest={overview.availableToInvest}
              totalDays={overview.pace.totalDays}
            />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsSection
              domain={domain}
              planningPlans={cyclePlanning.plans}
              exportBackup={exportBackup}
              restoreBackup={restoreBackup}
            />
          </TabsContent>
        </Tabs>
      </main>

      <CycleExpenseDialog
        key={cycle.id}
        editor={expenseEditor}
        onChange={setExpenseEditor}
        onClose={() => setExpenseEditor(null)}
        cycleId={cycle.id}
        periodLabel={periods.cycle.label}
        domain={domain}
      />
    </div>
  );
};

export default Index;
