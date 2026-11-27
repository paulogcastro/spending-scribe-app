import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addCommitment, anticipateInstallment, commitmentStatus, correctCommitmentOccurrence, createExpenseDomainState, definitionAtCycle, EXPENSE_DOMAIN_STORAGE_KEY, futureChangeCycle, futureCommitmentCycles, generateCycleCommitments, installmentProgress, loadExpenseDomainState, parseExpenseDomainState, plannedCommitments, reviseCommitment, saveExpenseDomainState, type CommitmentInput } from './expenseDomain';
import { applyBackup, buildBackup, parseBackup } from './backup';
import { CYCLE_STORAGE_KEY, createFinancialCycle } from './financialCycles';

const nov = '2026-11-04'; const dec = '2026-12-04'; const jan = '2027-01-04';
const input: CommitmentInput = { description: 'Aluguel', amount: 1000, group: 'casa', categoryId: 'category-moradia', paymentMethodId: 'payment-pix', startCycleId: nov, dayOfMonth: 5, totalInstallments: 3 };
const recurring = () => addCommitment(createExpenseDomainState(), 'recorrente', input);
const installments = () => addCommitment(createExpenseDomainState(), 'parcelado', { ...input, description: 'Compra', group: 'parcelados', amount: 100 });
function memory() { const map = new Map<string, string>(); return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); }, removeItem: (key: string) => { map.delete(key); } }; }

test('recorrências aceitam Carro, Casa e Fixos; parcelas aceitam Carro, Casa e Parcelados', () => {
  for (const group of ['carro', 'casa', 'fixos', 'parcelados', 'diarias'] as const) {
    for (const kind of ['recorrente', 'parcelado'] as const) {
      const allowed = kind === 'recorrente' ? ['carro', 'casa', 'fixos'] : ['carro', 'casa', 'parcelados'];
      if (allowed.includes(group)) assert.equal(plannedCommitments(addCommitment(createExpenseDomainState(), kind, { ...input, group }), nov)[0].group, group);
      else assert.throws(() => addCommitment(createExpenseDomainState(), kind, { ...input, group }));
    }
  }
});
test('cadastro valida valor positivo, descrição, ciclo, quantidade e dia de referência', () => {
  for (const update of [{ amount: 0 }, { description: ' ' }, { startCycleId: '2026-11-05' }, { categoryId: 'missing' }, { paymentMethodId: '' }, { dayOfMonth: 32 }]) assert.throws(() => addCommitment(createExpenseDomainState(), 'recorrente', { ...input, ...update }));
  for (const totalInstallments of [0, 1.5, -1]) assert.throws(() => addCommitment(createExpenseDomainState(), 'parcelado', { ...input, totalInstallments }));
});
for (const group of ['carro', 'casa'] as const) {
  test(`${group}: parcelamento mantém grupo e valor por parcela até a quantidade cadastrada`, () => {
    const state = addCommitment(createExpenseDomainState(), 'parcelado', { ...input, group, amount: 150, totalInstallments: 3 });
    for (const [cycle, number] of [[nov, 1], [dec, 2], [jan, 3]] as const) {
      const [item] = plannedCommitments(state, cycle);
      assert.equal(item.group, group);
      assert.equal(item.amount, 150);
      assert.deepEqual(item.installment, { number, total: 3 });
    }
    assert.equal(plannedCommitments(state, '2027-02-04').length, 0);
  });
  test(`${group}: recorrência mantém grupo, valor e dia de referência nos ciclos seguintes`, () => {
    const state = addCommitment(createExpenseDomainState(), 'recorrente', { ...input, group, amount: 200, dayOfMonth: 12 });
    for (const cycle of [nov, dec, jan]) {
      const [item] = plannedCommitments(state, cycle);
      assert.equal(item.group, group);
      assert.equal(item.amount, 200);
      assert.equal(item.date, `${cycle.slice(0, 7)}-12`);
      assert.equal(item.nature, 'recorrente');
      assert.equal(item.installment, undefined);
    }
  });
}
test('gera exatamente uma ocorrência vinculada por ciclo e não gera antes do início', () => {
  const state = recurring(); const id = Object.keys(state.recurringDefinitions)[0];
  assert.equal(plannedCommitments(state, '2026-10-04').length, 0);
  const generated = generateCycleCommitments(state, nov, dec);
  assert.equal(generated.cycles[nov].length, 1); assert.equal(generated.cycles[nov][0].definitionId, id);
  assert.equal(generated.cycles[nov][0].date, '2026-11-05'); assert.equal(generated.cycles[nov][0].amount, 1000);
  assert.equal(generated.cycles[dec], undefined);
});
test('geração é idempotente ao repetir, carregar e alternar ciclos', () => {
  let state = generateCycleCommitments(recurring(), nov, jan);
  const first = state.cycles[nov][0];
  assert.equal(generateCycleCommitments(state, nov, jan), state);
  state = generateCycleCommitments(state, dec, jan);
  state = generateCycleCommitments(parseExpenseDomainState(JSON.stringify(state)), nov, jan);
  assert.deepEqual(state.cycles[nov], [first]); assert.equal(state.cycles[dec].length, 1);
});
test('dias 1 a 3 pertencem ao mês seguinte; dia 31 é limitado ao último dia civil', () => {
  assert.equal(plannedCommitments(addCommitment(createExpenseDomainState(), 'recorrente', { ...input, dayOfMonth: 3 }), nov)[0].date, '2026-12-03');
  assert.equal(plannedCommitments(addCommitment(createExpenseDomainState(), 'recorrente', { ...input, dayOfMonth: 31, startCycleId: '2028-02-04' }), '2028-02-04')[0].date, '2028-02-29');
  assert.equal(plannedCommitments(addCommitment(createExpenseDomainState(), 'recorrente', { ...input, dayOfMonth: 31, startCycleId: '2027-02-04' }), '2027-02-04')[0].date, '2027-02-28');
});
test('parcelas progridem pelo ciclo, inclusive consultando ciclos anteriores fora de ordem', () => {
  let state = installments();
  for (const [cycle, number] of [[jan, 3], [nov, 1], [dec, 2]] as const) {
    state = generateCycleCommitments(state, cycle, jan);
    assert.deepEqual(state.cycles[cycle][0].installment, { number, total: 3 });
  }
  assert.equal(plannedCommitments(state, '2027-02-04').length, 0);
  assert.equal(commitmentStatus(Object.values(state.installmentDefinitions)[0], '2027-02-04'), 'concluida');
  assert.deepEqual(installmentProgress(Object.values(state.installmentDefinitions)[0], dec), { remaining: 2, finalCycleId: jan });
});
test('compromissos futuros são só previsões e não são persistidos nem somados ao ciclo atual', () => {
  const state = installments();
  assert.equal(generateCycleCommitments(state, dec, nov), state);
  assert.equal(Object.keys(state.cycles).length, 0);
  const forecasts = futureCommitmentCycles(state, nov, 3);
  assert.deepEqual(forecasts.map(value => value.items.length), [1, 1, 0]);
  assert.deepEqual(forecasts[0].items[0].installment, { number: 2, total: 3 });
});
test('correção de recorrência modifica somente uma ocorrência, preservando ID e definição', () => {
  let state = generateCycleCommitments(recurring(), nov, dec); state = generateCycleCommitments(state, dec, dec);
  const original = state; const item = state.cycles[nov][0];
  state = correctCommitmentOccurrence(state, nov, item.id, 1150);
  assert.equal(state.cycles[nov][0].amount, 1150); assert.equal(state.cycles[nov][0].id, item.id);
  assert.deepEqual(state.cycles[dec], original.cycles[dec]); assert.deepEqual(state.recurringDefinitions, original.recurringDefinitions);
  assert.throws(() => correctCommitmentOccurrence(state, dec, item.id, 10));
  assert.throws(() => correctCommitmentOccurrence(state, nov, item.id, 0));
});
test('correção de parcela preserva contador e demais ciclos', () => {
  let state = generateCycleCommitments(installments(), nov, dec); state = generateCycleCommitments(state, dec, dec);
  const second = state.cycles[dec][0];
  state = correctCommitmentOccurrence(state, nov, state.cycles[nov][0].id, 99);
  assert.deepEqual(state.cycles[nov][0].installment, { number: 1, total: 3 }); assert.deepEqual(state.cycles[dec][0], second);
});
test('editar definição futura preserva ocorrências existentes e histórico ainda não consultado', () => {
  let state = recurring(); const id = Object.keys(state.recurringDefinitions)[0];
  state = reviseCommitment(state, 'recorrente', id, dec, { ...input, amount: 1200, group: 'fixos', dayOfMonth: 2 }, undefined, nov);
  state = generateCycleCommitments(state, dec, dec); state = generateCycleCommitments(state, nov, dec);
  assert.equal(state.cycles[nov][0].amount, 1000); assert.equal(state.cycles[nov][0].group, 'casa');
  assert.equal(state.cycles[dec][0].amount, 1200); assert.equal(state.cycles[dec][0].group, 'fixos'); assert.equal(state.cycles[dec][0].date, '2027-01-02');
  assert.equal(state.recurringDefinitions[id].amount, 1000);
});
test('suspensão e retomada guardam intervalos históricos sem gerar durante a suspensão', () => {
  let state = recurring(); const id = Object.keys(state.recurringDefinitions)[0];
  state = reviseCommitment(state, 'recorrente', id, dec, undefined, 'suspensa', nov);
  state = reviseCommitment(state, 'recorrente', id, jan, undefined, 'ativa', dec);
  assert.equal(plannedCommitments(state, nov).length, 1); assert.equal(plannedCommitments(state, dec).length, 0); assert.equal(plannedCommitments(state, jan).length, 1);
  assert.equal(commitmentStatus(state.recurringDefinitions[id], dec), 'suspensa');
  state = generateCycleCommitments(state, nov, jan); assert.equal(state.cycles[nov][0].amount, 1000);
});
test('encerramento preserva passado e impede geração e reabertura futura', () => {
  let state = recurring(); const id = Object.keys(state.recurringDefinitions)[0];
  state = reviseCommitment(state, 'recorrente', id, dec, undefined, 'concluida', nov);
  assert.equal(plannedCommitments(state, nov).length, 1); assert.equal(plannedCommitments(state, dec).length, 0);
  assert.equal(commitmentStatus(state.recurringDefinitions[id], dec), 'concluida');
  assert.throws(() => reviseCommitment(state, 'recorrente', id, jan, undefined, 'ativa', dec));
});
test('cronograma futuro pode adiar a próxima parcela sem mudar a anterior, e preserva histórico do total', () => {
  let state = generateCycleCommitments(installments(), nov, nov); const item = state.cycles[nov][0]; const id = Object.keys(state.installmentDefinitions)[0];
  state = reviseCommitment(state, 'parcelado', id, dec, { ...input, group: 'parcelados', startCycleId: jan, amount: 150, totalInstallments: 4 }, undefined, nov);
  assert.equal(plannedCommitments(state, dec).length, 0);
  state = generateCycleCommitments(state, jan, jan);
  assert.deepEqual(state.cycles[nov][0], item); assert.deepEqual(state.cycles[jan][0].installment, { number: 2, total: 4 });
  assert.equal(state.cycles[jan][0].amount, 150);
  assert.deepEqual(installmentProgress(state.installmentDefinitions[id], jan), { remaining: 3, finalCycleId: '2027-03-04' });
  assert.equal(plannedCommitments(state, '2027-04-04').length, 0);
});
test('edição futura não depende da quantidade de ciclos anteriormente consultados', () => {
  let state = installments(); const id = Object.keys(state.installmentDefinitions)[0];
  state = reviseCommitment(state, 'parcelado', id, jan, { ...input, group: 'parcelados', startCycleId: jan, totalInstallments: 4 }, undefined, dec);
  assert.deepEqual(plannedCommitments(state, jan)[0].installment, { number: 3, total: 4 });
  state = generateCycleCommitments(state, dec, jan); assert.deepEqual(state.cycles[dec][0].installment, { number: 2, total: 3 });
});
test('edições da definição rejeitam períodos atuais ou históricos e ocorrências já materializadas', () => {
  const state = generateCycleCommitments(recurring(), dec, dec); const id = Object.keys(state.recurringDefinitions)[0];
  assert.throws(() => reviseCommitment(state, 'recorrente', id, nov, input, undefined, nov));
  assert.throws(() => reviseCommitment(state, 'recorrente', id, dec, input, undefined, nov));
  assert.equal(futureChangeCycle('2026-10-04', nov), dec); assert.equal(futureChangeCycle(dec, nov), jan);
});
test('catálogos inativos históricos são aceitos, mas não novas referências inativas', () => {
  let state = recurring(); const id = Object.keys(state.recurringDefinitions)[0];
  state.categories['category-moradia'].active = false; state.categories['category-alimentacao'].active = false;
  state = reviseCommitment(state, 'recorrente', id, dec, { ...input, amount: 1100 }, undefined, nov);
  assert.equal(definitionAtCycle(state.recurringDefinitions[id], dec).amount, 1100);
  assert.throws(() => reviseCommitment(state, 'recorrente', id, jan, { ...input, categoryId: 'category-alimentacao' }, undefined, dec));
});
test('duplicação de vínculo por ciclo e revisões inválidas são rejeitadas', () => {
  let state = generateCycleCommitments(recurring(), nov, nov);
  state.cycles[nov].push({ ...state.cycles[nov][0], id: 'duplicate' });
  assert.throws(() => parseExpenseDomainState(JSON.stringify(state)));
  state = recurring(); const id = Object.keys(state.recurringDefinitions)[0];
  state = reviseCommitment(state, 'recorrente', id, dec, input, undefined, nov);
  const revision = state.recurringDefinitions[id].revisions?.[0];
  assert.ok(revision); revision.categoryId = 'missing';
  assert.throws(() => parseExpenseDomainState(JSON.stringify(state)));
});
test('persistência e backup v3 restauram definições, revisões, correções e ciclos sem duplicar', () => {
  let state = generateCycleCommitments(recurring(), nov, nov); const id = Object.keys(state.recurringDefinitions)[0];
  state = correctCommitmentOccurrence(state, nov, state.cycles[nov][0].id, 1234);
  state = reviseCommitment(state, 'recorrente', id, dec, undefined, 'suspensa', nov);
  const source = memory(); source.setItem('finance-tracker-data', '{}');
  source.setItem(CYCLE_STORAGE_KEY, JSON.stringify({ version: 1, selectedCycleId: nov, cycles: { [nov]: createFinancialCycle(nov) } }));
  saveExpenseDomainState(source, state);
  const backup = parseBackup(JSON.stringify(buildBackup(source, {}))); assert.equal(backup.version, 3);
  const target = memory(); applyBackup(target, backup);
  assert.deepEqual(loadExpenseDomainState(target), state);
  assert.equal(generateCycleCommitments(loadExpenseDomainState(target), nov, nov).cycles[nov].length, 1);
  assert.equal(JSON.parse(target.getItem(EXPENSE_DOMAIN_STORAGE_KEY) ?? '{}').version, 1);
  assert.equal(target.getItem('finance-tracker-data'), '{}');
});

test('anticipateInstallment antecipa parcialmente ou quita com desconto sem alterar histórico passado', () => {
  const base = addCommitment(createExpenseDomainState(), 'parcelado', {
    ...input,
    description: 'Notebook',
    group: 'parcelados',
    amount: 200,
    totalInstallments: 4,
  });
  const [defId] = Object.keys(base.installmentDefinitions);
  const withNov = generateCycleCommitments(base, nov, nov);
  assert.equal(withNov.cycles[nov].length, 1);
  assert.deepEqual(withNov.cycles[nov][0].installment, { number: 1, total: 4 });

  // Antecipar 1 parcela com desconto (R$ 180) no ciclo atual (nov)
  const partial = anticipateInstallment(withNov, {
    definitionId: defId,
    selectedCycleId: nov,
    targetCycleId: nov,
    count: 1,
    paidAmount: 180,
    todayCycle: nov,
  });
  // Ocorrência original de nov (1/4) preservada + lançamento de antecipação em nov
  assert.equal(partial.cycles[nov].length, 2);
  assert.deepEqual(partial.cycles[nov][0].installment, { number: 1, total: 4 });
  assert.equal(partial.cycles[nov][1].amount, 180);
  assert.equal(partial.cycles[nov][1].description, 'Antecipação: Notebook (1x)');
  // Em dez e jan agora restam parcelas 2/3 e 3/3; fev não tem mais parcela
  assert.equal(plannedCommitments(partial, dec)[0].installment?.number, 2);
  assert.equal(plannedCommitments(partial, dec)[0].installment?.total, 3);
  assert.equal(plannedCommitments(partial, jan)[0].installment?.number, 3);
  assert.equal(plannedCommitments(partial, '2027-02-04').length, 0);

  // Quitar as 2 parcelas restantes com desconto (R$ 350)
  const settled = anticipateInstallment(partial, {
    definitionId: defId,
    selectedCycleId: nov,
    targetCycleId: nov,
    count: 2,
    paidAmount: 350,
    todayCycle: nov,
  });
  assert.equal(commitmentStatus(settled.installmentDefinitions[defId], dec), 'concluida');
  assert.equal(plannedCommitments(settled, dec).length, 0);
  assert.equal(settled.cycles[nov].length, 3);
  assert.equal(settled.cycles[nov][2].description, 'Quitação: Notebook (2x)');
  assert.equal(settled.cycles[nov][2].amount, 350);
});