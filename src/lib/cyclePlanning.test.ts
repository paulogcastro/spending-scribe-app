import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLANNING_STORAGE_KEY,
  addExtraIncome,
  computePlanning,
  computeSubgoals,
  copyConfigFrom,
  createEmptyPlanning,
  dailyResidualPercent,
  extraIncomeTotal,
  getCyclePlanning,
  loadPlanningState,
  mainExpenseGoal,
  parsePlanningState,
  removeExtraIncome,
  savePlanningState,
  setDistributionPercent,
  setInvestmentBaseGoal,
  setPlannedSalary,
  setReceivedSalary,
  totalInvestmentGoal,
  updateExtraIncome,
  upsertPlanning,
} from './cyclePlanning';

function makeStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

test('meta principal de despesas = salário planejado - meta-base, sem rendas extras', () => {
  let plan = createEmptyPlanning('2026-11-04');
  plan = setPlannedSalary(plan, 6000);
  plan = setInvestmentBaseGoal(plan, 1000);
  plan = addExtraIncome(plan, { description: 'Freela', amount: 800 });
  assert.equal(mainExpenseGoal(plan), 5000);
});

test('meta total de investimento = meta-base + soma integral das rendas extras', () => {
  let plan = createEmptyPlanning('2026-11-04');
  plan = setPlannedSalary(plan, 6000);
  plan = setInvestmentBaseGoal(plan, 1000);
  plan = addExtraIncome(plan, { description: 'Freela', amount: 500 });
  plan = addExtraIncome(plan, { description: 'Venda', amount: 300.5 });
  assert.equal(extraIncomeTotal(plan), 800.5);
  assert.equal(totalInvestmentGoal(plan), 1000);
});

test('inclusão, edição e exclusão de renda extra não alteram a meta fixa de investimento', () => {
  let plan = createEmptyPlanning('2026-11-04');
  plan = setPlannedSalary(plan, 6000);
  plan = setInvestmentBaseGoal(plan, 1000);
  plan = addExtraIncome(plan, { description: 'Freela', amount: 500 });
  const id = plan.extraIncomes[0].id;
  assert.equal(totalInvestmentGoal(plan), 1000);
  plan = updateExtraIncome(plan, id, { amount: 700 });
  assert.equal(totalInvestmentGoal(plan), 1000);
  plan = updateExtraIncome(plan, id, { description: 'Freela site' });
  assert.equal(plan.extraIncomes[0].description, 'Freela site');
  plan = removeExtraIncome(plan, id);
  assert.equal(totalInvestmentGoal(plan), 1000);
  assert.equal(plan.extraIncomes.length, 0);
});

test('distribuição do exemplo: 15/20/25/10 com residual de 30% fecha em R$ 5.000', () => {
  let plan = createEmptyPlanning('2026-11-04');
  plan = setPlannedSalary(plan, 6000);
  plan = setInvestmentBaseGoal(plan, 1000);
  plan = setDistributionPercent(plan, 'carro', 15);
  plan = setDistributionPercent(plan, 'casa', 20);
  plan = setDistributionPercent(plan, 'fixos', 25);
  plan = setDistributionPercent(plan, 'parcelados', 10);
  const subgoals = computeSubgoals(plan);
  assert.equal(subgoals.carro.amount, 750);
  assert.equal(subgoals.casa.amount, 1000);
  assert.equal(subgoals.fixos.amount, 1250);
  assert.equal(subgoals.parcelados.amount, 500);
  assert.equal(subgoals.diarias.percent, 30);
  assert.equal(subgoals.diarias.amount, 1500);
  const sum = Object.values(subgoals).reduce((acc, s) => acc + s.amount, 0);
  assert.equal(sum, 5000);
});

test('gastos diários é sempre o residual e assume 0% quando a soma atinge 100%', () => {
  let plan = createEmptyPlanning('2026-11-04');
  plan = setDistributionPercent(plan, 'carro', 40);
  plan = setDistributionPercent(plan, 'casa', 30);
  assert.equal(dailyResidualPercent(plan), 30);
  plan = setDistributionPercent(plan, 'fixos', 20);
  plan = setDistributionPercent(plan, 'parcelados', 10);
  assert.equal(dailyResidualPercent(plan), 0);
});

test('rejeita percentuais cuja soma ultrapasse 100% e valores fora de 0–100', () => {
  let plan = createEmptyPlanning('2026-11-04');
  plan = setDistributionPercent(plan, 'carro', 60);
  plan = setDistributionPercent(plan, 'casa', 30);
  assert.throws(() => setDistributionPercent(plan, 'fixos', 11), /100%/);
  assert.throws(() => setDistributionPercent(plan, 'fixos', -1));
  assert.throws(() => setDistributionPercent(plan, 'fixos', 101));
  assert.equal(plan.distribution.fixos, 0); // plano original intacto
});

test('rejeita meta-base negativa ou superior ao salário planejado', () => {
  let plan = createEmptyPlanning('2026-11-04');
  plan = setPlannedSalary(plan, 6000);
  assert.throws(() => setInvestmentBaseGoal(plan, 6001), /salário planejado/);
  assert.throws(() => setInvestmentBaseGoal(plan, -10));
  plan = setInvestmentBaseGoal(plan, 6000); // limite exato é permitido
  assert.equal(mainExpenseGoal(plan), 0);
  assert.throws(() => setPlannedSalary(plan, 5000), /meta-base/);
});

test('a soma das cinco submetas fecha exatamente após arredondamento em centavos', () => {
  let plan = createEmptyPlanning('2026-11-04');
  plan = setPlannedSalary(plan, 3333.33);
  plan = setInvestmentBaseGoal(plan, 1111.11);
  plan = setDistributionPercent(plan, 'carro', 33.33);
  plan = setDistributionPercent(plan, 'casa', 33.33);
  plan = setDistributionPercent(plan, 'fixos', 33.33);
  const subgoals = computeSubgoals(plan);
  const main = mainExpenseGoal(plan);
  const sum = Object.values(subgoals).reduce((acc, s) => acc + s.amount, 0);
  assert.equal(Math.round(sum * 100) / 100, main);
  assert.equal(subgoals.diarias.amount, Math.round((main - subgoals.carro.amount - subgoals.casa.amount - subgoals.fixos.amount - subgoals.parcelados.amount) * 100) / 100);
});

test('alterar salário ou meta-base recalcula valores preservando os percentuais', () => {
  let plan = createEmptyPlanning('2026-11-04');
  plan = setPlannedSalary(plan, 6000);
  plan = setInvestmentBaseGoal(plan, 1000);
  plan = setDistributionPercent(plan, 'carro', 20);
  assert.equal(computeSubgoals(plan).carro.amount, 1000);
  plan = setPlannedSalary(plan, 8000);
  assert.equal(computeSubgoals(plan).carro.amount, 1400);
  assert.equal(plan.distribution.carro, 20);
  plan = setInvestmentBaseGoal(plan, 2000);
  assert.equal(computeSubgoals(plan).carro.amount, 1200);
});

test('os dados de planejamento são isolados entre ciclos', () => {
  let state = { version: 1 as const, plans: {} };
  let planA = createEmptyPlanning('2026-11-04');
  planA = setPlannedSalary(planA, 6000);
  state = upsertPlanning(state, planA);
  let planB = getCyclePlanning(state, '2026-12-04');
  planB = setPlannedSalary(planB, 9000);
  state = upsertPlanning(state, planB);
  assert.equal(state.plans['2026-11-04'].plannedSalary, 6000);
  assert.equal(state.plans['2026-12-04'].plannedSalary, 9000);
});

test('ciclo novo copia apenas configurações do ciclo imediatamente anterior', () => {
  let state = { version: 1 as const, plans: {} };
  let plan = createEmptyPlanning('2026-11-04');
  plan = setPlannedSalary(plan, 6000);
  plan = setReceivedSalary(plan, 5800);
  plan = setInvestmentBaseGoal(plan, 1000);
  plan = setDistributionPercent(plan, 'carro', 15);
  plan = setDistributionPercent(plan, 'casa', 20);
  plan = addExtraIncome(plan, { description: 'Freela', amount: 500 });
  state = upsertPlanning(state, plan);

  const next = getCyclePlanning(state, '2026-12-04');
  assert.equal(next.plannedSalary, 6000);
  assert.equal(next.investmentBaseGoal, 1000);
  assert.equal(next.distribution.carro, 15);
  assert.equal(next.distribution.casa, 20);
  // Realizações nunca são copiadas
  assert.equal(next.receivedSalary, 0);
  assert.equal(next.extraIncomes.length, 0);
  // Submetas recalculadas com base nas configurações copiadas
  assert.equal(computeSubgoals(next).carro.amount, 750);
});

test('ciclo com planejamento próprio nunca é sobrescrito pela inicialização', () => {
  let state = { version: 1 as const, plans: {} };
  let previous = createEmptyPlanning('2026-11-04');
  previous = setPlannedSalary(previous, 6000);
  state = upsertPlanning(state, previous);
  let own = createEmptyPlanning('2026-12-04');
  own = setPlannedSalary(own, 9000);
  state = upsertPlanning(state, own);
  assert.equal(getCyclePlanning(state, '2026-12-04').plannedSalary, 9000);
});

test('ciclo sem antecessor inicia zerado', () => {
  const plan = getCyclePlanning({ version: 1, plans: {} }, '2026-11-04');
  assert.deepEqual(plan, createEmptyPlanning('2026-11-04'));
  assert.equal(dailyResidualPercent(plan), 100);
});

test('persistência validada: grava, lê e rejeita dados inválidos sem tocar no legado', () => {
  const legacy = '{"2026-11":{"income":[]}}';
  const storage = makeStorage({ 'finance-tracker-data': legacy });
  let state = loadPlanningState(storage);
  assert.deepEqual(state.plans, {});
  let plan = createEmptyPlanning('2026-11-04');
  plan = setPlannedSalary(plan, 6000);
  plan = setInvestmentBaseGoal(plan, 1000);
  plan = setDistributionPercent(plan, 'carro', 15);
  state = upsertPlanning(state, plan);
  savePlanningState(storage, state);
  assert.deepEqual(loadPlanningState(storage), state);
  assert.equal(storage.values.get('finance-tracker-data'), legacy);
  assert.ok(storage.values.has(PLANNING_STORAGE_KEY));
  assert.throws(() => parsePlanningState('{}'));
  assert.throws(() => parsePlanningState(JSON.stringify({ version: 1, plans: { '2026-11-04': { ...plan, investmentBaseGoal: 7000 } } })));
  assert.throws(() => parsePlanningState(JSON.stringify({ version: 1, plans: { '2026-11-04': { ...plan, distribution: { carro: 60, casa: 50, fixos: 0, parcelados: 0 } } } })));
  assert.throws(() => parsePlanningState(JSON.stringify({ version: 1, plans: { '2026-11-09': plan } })));
});

test('renda extra exige descrição e valor não negativo', () => {
  const plan = createEmptyPlanning('2026-11-04');
  assert.throws(() => addExtraIncome(plan, { description: '  ', amount: 100 }));
  assert.throws(() => addExtraIncome(plan, { description: 'Freela', amount: -5 }));
  const withIncome = addExtraIncome(plan, { description: 'Freela', amount: 100 });
  assert.throws(() => updateExtraIncome(withIncome, withIncome.extraIncomes[0].id, { amount: -1 }));
});

test('computePlanning consolida todos os derivados pela mesma fonte de cálculo', () => {
  let plan = createEmptyPlanning('2026-11-04');
  plan = setPlannedSalary(plan, 6000);
  plan = setInvestmentBaseGoal(plan, 1000);
  plan = addExtraIncome(plan, { description: 'Freela', amount: 250 });
  const derived = computePlanning(plan);
  assert.equal(derived.extraIncomeTotal, 250);
  assert.equal(derived.investmentIncrement, 0);
  assert.equal(derived.totalInvestmentGoal, 1000);
  assert.equal(derived.mainExpenseGoal, 5000);
  assert.equal(derived.subgoals.diarias.percent, 100);
});

test('copyConfigFrom não copia realizações e valida o ciclo de destino', () => {
  let plan = createEmptyPlanning('2026-11-04');
  plan = setReceivedSalary(plan, 5800);
  plan = addExtraIncome(plan, { description: 'Freela', amount: 500 });
  const copy = copyConfigFrom(plan, '2026-12-04');
  assert.equal(copy.receivedSalary, 0);
  assert.equal(copy.extraIncomes.length, 0);
  assert.throws(() => copyConfigFrom(plan, '2026-12-05'));
});

test('renda extra aceita data civil opcional de recebimento, persiste e rejeita datas inválidas', () => {
  let plan = createEmptyPlanning('2026-11-04');
  plan = addExtraIncome(plan, { description: 'Freela', amount: 400, date: '2026-11-18' });
  const id = plan.extraIncomes[0].id;
  assert.equal(plan.extraIncomes[0].date, '2026-11-18');

  plan = updateExtraIncome(plan, id, { date: '2026-11-20' });
  assert.equal(plan.extraIncomes[0].date, '2026-11-20');

  const parsed = parsePlanningState(JSON.stringify(upsertPlanning({ version: 1, plans: {} }, plan)));
  assert.equal(parsed.plans['2026-11-04'].extraIncomes[0].date, '2026-11-20');

  plan = updateExtraIncome(plan, id, { date: '' });
  assert.equal(plan.extraIncomes[0].date, undefined);

  assert.throws(() => addExtraIncome(plan, { description: 'Erro', amount: 100, date: '2026-02-31' }));
  assert.throws(() => addExtraIncome(plan, { description: 'Erro', amount: 100, date: '18/11/2026' }));
});
