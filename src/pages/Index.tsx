import { useMemo, useState, useEffect } from 'react';
import { useFinances } from '@/hooks/useFinances';
import { useFinancialCycles } from '@/hooks/useFinancialCycles';
import { CycleSelector } from '@/components/CycleSelector';
import { CyclePlanningSection } from '@/components/CyclePlanningSection';
import { financialPeriods } from '@/lib/financialPeriods';
import { useCyclePlanning } from '@/hooks/useCyclePlanning';
import { Receipt, Target, Plus, Settings2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

type MainTab = 'cycle-expenses' | 'planning' | 'settings';

const navItems: { id: MainTab; label: string; icon: typeof Receipt }[] = [
  { id: 'cycle-expenses', label: 'Despesas', icon: Receipt },
  { id: 'planning', label: 'Planejamento', icon: Target },
  { id: 'settings', label: 'Configurações', icon: Settings2 },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<MainTab>('cycle-expenses');
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

      <main className="container space-y-5 pb-24 pt-4 sm:space-y-6 sm:pb-8 sm:pt-6">
        {/* Barra superior: Seletor de ciclo + Segmented Control (Desktop) + Nova despesa */}
        <div className="sticky top-0 z-20 flex flex-col gap-3 bg-background/90 py-2.5 backdrop-blur-sm sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="sm:justify-self-start">
            <CycleSelector cycle={cycle} onNavigate={navigateCycle} />
          </div>

          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-1 rounded-2xl border border-border bg-card p-1 shadow-card sm:inline-flex sm:justify-self-center"
          >
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          <div className="sm:justify-self-end">
            {activeTab === 'cycle-expenses' && (
              <Button className="h-11 w-full gap-2 rounded-xl shadow-sm sm:w-auto" disabled={domain.readOnly} onClick={() => startExpense()}>
                <Plus className="h-4 w-4" />
                Nova despesa
              </Button>
            )}
          </div>
        </div>

        {activeTab === 'cycle-expenses' && (
          <div className="space-y-6">
            <CycleOverview
              planning={cyclePlanning.planning}
              domain={domain.state}
              periodLabel={periods.cycle.label}
              readOnly={cyclePlanning.readOnly || domain.readOnly}
            />
            <CycleExpenses
              key={cycle.id}
              cycleId={cycle.id}
              periodLabel={periods.cycle.label}
              domain={domain}
              subgoals={overview.subgoals}
              onAdd={startExpense}
              onEdit={editExpense}
            />
          </div>
        )}

        {activeTab === 'planning' && (
          <CyclePlanningSection
            key={cycle.id}
            cycleId={cycle.id}
            cyclePlanning={cyclePlanning}
            budgetGroups={orderedGroups}
            availableToInvest={overview.availableToInvest}
            totalDays={overview.pace.totalDays}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsSection
            domain={domain}
            planningPlans={cyclePlanning.plans}
            exportBackup={exportBackup}
            restoreBackup={restoreBackup}
          />
        )}
      </main>

      {/* Bottom Navigation Bar fixa no celular */}
      <nav
        aria-label="Navegação principal mobile"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 gap-1 border-t border-border bg-card/95 px-2 py-1.5 backdrop-blur-md pb-[max(0.375rem,env(safe-area-inset-bottom))] sm:hidden"
      >
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] transition-colors ${
                active
                  ? 'bg-primary/15 font-semibold text-primary'
                  : 'font-medium text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

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
