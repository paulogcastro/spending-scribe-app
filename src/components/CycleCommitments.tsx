import { useState } from 'react';
import { Repeat2, CreditCard, Pencil, Pause, Play, CircleStop, FastForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useExpenseDomain } from '@/hooks/useExpenseDomain';
import { addCommitment, anticipateInstallment, reviseCommitment, definitionAtCycle, commitmentStatus, futureChangeCycle, futureCommitmentCycles, installmentProgress, getBudgetGroupsMap, getOrderedBudgetGroups, isExpenseNatureCompatible, type CommitmentKind, type CommitmentInput, type CommitmentStatus, type CommitmentDefinition } from '@/lib/expenseDomain';
import { roundMoney } from '@/lib/cyclePlanning';
import { getFinancialCycle, cycleStartDate } from '@/lib/financialCycles';
import { formatCurrency } from '@/lib/format';

const statusLabels = { ativa: 'Ativa', suspensa: 'Suspensa', concluida: 'Concluída' };
const cycleLabel = (value: string) => cycleStartDate(value).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
interface Editor { kind: CommitmentKind; id?: string; input: CommitmentInput; oldCategory?: string; oldPayment?: string }
interface Pending { kind: CommitmentKind; id: string; description: string; status: CommitmentStatus }
interface AnticipationState {
  id: string;
  description: string;
  installmentAmount: number;
  remaining: number;
  count: number;
  paidAmount: number;
  targetCycleId: string;
  note: string;
}

export function CycleCommitments({ domain, cycleId }: { domain: ReturnType<typeof useExpenseDomain>; cycleId: string }) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [anticipation, setAnticipation] = useState<AnticipationState | null>(null);
  const [filter, setFilter] = useState('todas');
  const today = getFinancialCycle().id;
  const effective = futureChangeCycle(cycleId, today);
  const groupsMap = getBudgetGroupsMap(domain.state);
  const orderedGroups = getOrderedBudgetGroups(domain.state);
  const definitions: { kind: CommitmentKind; original: CommitmentDefinition }[] = [
    ...Object.values(domain.state.recurringDefinitions).map(original => ({ kind: 'recorrente' as const, original })),
    ...Object.values(domain.state.installmentDefinitions).map(original => ({ kind: 'parcelado' as const, original })),
  ];
  const start = (kind: CommitmentKind, original?: CommitmentDefinition) => {
    const value = original ? definitionAtCycle(original, effective) : undefined;
    const defaultGroup = orderedGroups.find(g => isExpenseNatureCompatible(g.id, kind, groupsMap))?.id ?? (kind === 'recorrente' ? 'fixos' : 'parcelados');
    setEditor({ kind, id: original?.id, oldCategory: value?.categoryId, oldPayment: value?.paymentMethodId, input: {
      description: value?.description ?? '', amount: value?.amount ?? 0, group: value?.group ?? defaultGroup,
      categoryId: value?.categoryId ?? '', paymentMethodId: value?.paymentMethodId ?? '', note: value?.note ?? '',
      startCycleId: original ? effective : cycleId, dayOfMonth: value && 'dayOfMonth' in value ? value.dayOfMonth : 5,
      totalInstallments: value && 'totalInstallments' in value ? value.totalInstallments : 2,
    } });
  };
  const change = (updates: Partial<CommitmentInput>) => { if (editor) setEditor({ ...editor, input: { ...editor.input, ...updates } }); };
  const forecasts = futureCommitmentCycles(domain.state, cycleId > today ? cycleId : today);
  return <section aria-label="Recorrências e parcelamentos" className="space-y-4 border-t border-border pt-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Alterações futuras a partir de {cycleLabel(effective)}</p><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={domain.readOnly} onClick={() => start('recorrente')}><Repeat2 className="mr-2 h-4 w-4" />Nova recorrência</Button><Button variant="outline" size="sm" disabled={domain.readOnly} onClick={() => start('parcelado')}><CreditCard className="mr-2 h-4 w-4" />Novo parcelamento</Button></div></div>
    <div className="flex flex-wrap items-center justify-end gap-3"><Select value={filter} onValueChange={setFilter}><SelectTrigger aria-label="Filtrar compromissos" className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todos os estados</SelectItem>{Object.entries(statusLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}s</SelectItem>)}</SelectContent></Select></div>
    <ul className="divide-y divide-border">{definitions.filter(({ original }) => filter === 'todas' || commitmentStatus(original, effective) === filter).map(({ kind, original }) => {
      const value = definitionAtCycle(original, effective);
      const state = commitmentStatus(original, effective);
      let remaining: number | undefined; let end: string | undefined;
      if ('totalInstallments' in value) {
        const progress = installmentProgress(value, effective);
        remaining = progress.remaining; end = progress.finalCycleId;
      }
      return <li key={original.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="min-w-0 flex-1 basis-48"><p className="break-words font-medium">{value.description}</p><p className="mt-1 text-xs text-muted-foreground">{kind === 'recorrente' ? 'Recorrente' : 'Parcelado'} · {groupsMap[value.group]?.name ?? value.group} · {formatCurrency(value.amount)}{kind === 'parcelado' ? ' / parcela' : ' / ciclo'}</p><p className={`mt-2 inline-flex items-center rounded-sm px-2 py-1 text-xs font-medium ${state === 'ativa' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{state === 'ativa' ? 'Ativo' : statusLabels[state]}{original.revisions?.some(revision => revision.effectiveCycleId === effective) ? ` a partir de ${cycleLabel(effective)}` : ''}</p>{remaining !== undefined && <p className="mt-1 text-xs text-muted-foreground">{remaining} parcela(s) após o ciclo atual · Última: {end ? cycleLabel(end) : '—'}</p>}</div><div className="flex shrink-0 items-center gap-1">{kind === 'parcelado' && remaining !== undefined && remaining > 0 && state !== 'concluida' && <Button variant="ghost" size="icon" title="Antecipar ou quitar parcelas" aria-label={`Antecipar ou quitar ${value.description}`} disabled={domain.readOnly} onClick={() => setAnticipation({ id: original.id, description: value.description, installmentAmount: value.amount, remaining, count: remaining, paidAmount: roundMoney(value.amount * remaining), targetCycleId: cycleId, note: '' })}><FastForward className="h-4 w-4 text-primary" /></Button>}<Button variant="ghost" size="icon" title="Editar compromisso futuro" aria-label={`Editar compromisso ${value.description}`} disabled={domain.readOnly || state === 'concluida'} onClick={() => start(kind, original)}><Pencil className="h-4 w-4" /></Button>{kind === 'recorrente' && <Button variant="ghost" size="icon" title={state === 'suspensa' ? 'Retomar recorrência' : 'Suspender recorrência'} aria-label={`${state === 'suspensa' ? 'Retomar' : 'Suspender'} ${value.description}`} disabled={domain.readOnly || state === 'concluida'} onClick={() => setPending({ kind, id: original.id, description: value.description, status: state === 'suspensa' ? 'ativa' : 'suspensa' })}>{state === 'suspensa' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</Button>}<Button variant="ghost" size="icon" title="Encerrar compromisso" aria-label={`Encerrar ${value.description}`} disabled={domain.readOnly || state === 'concluida'} onClick={() => setPending({ kind, id: original.id, description: value.description, status: 'concluida' })}><CircleStop className="h-4 w-4 text-destructive" /></Button></div></li>;
    })}</ul>
    {!definitions.length && <p className="text-sm text-muted-foreground">Nenhum compromisso cadastrado.</p>}
    <details className="border-t border-border pt-4"><summary className="cursor-pointer text-sm font-semibold">Previsão dos próximos 12 ciclos</summary><div className="mt-3 space-y-3">{forecasts.filter(value => value.items.length).map(value => <section key={value.cycleId} aria-label={`Previsão ${value.cycleId}`} className="border-l-2 border-border pl-3"><h4 className="text-sm font-medium">{cycleLabel(value.cycleId)} · Previsto: {formatCurrency(value.items.reduce((sum, item) => sum + item.amount, 0))}</h4><ul>{value.items.map(item => <li key={item.id} className="mt-1 break-words text-xs text-muted-foreground">{item.description} · {formatCurrency(item.amount)} · {item.installment ? `Parcela ${item.installment.number}/${item.installment.total}` : 'Recorrente'}</li>)}</ul></section>)}{!forecasts.some(value => value.items.length) && <p className="text-sm text-muted-foreground">Nenhum compromisso previsto neste período.</p>}</div></details>
    <Dialog open={editor !== null} onOpenChange={open => { if (!open) setEditor(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editor?.id ? 'Editar compromisso futuro' : editor?.kind === 'recorrente' ? 'Nova recorrência' : 'Novo parcelamento'}</DialogTitle><DialogDescription>{editor?.id ? `A partir de ${cycleLabel(effective)}. Histórico preservado.` : 'Será lançado automaticamente a partir do ciclo escolhido.'}</DialogDescription></DialogHeader>{editor && <form className="finance-form" onSubmit={event => { event.preventDefault(); if (domain.mutate(state => editor.id ? reviseCommitment(state, editor.kind, editor.id, effective, editor.input) : addCommitment(state, editor.kind, editor.input))) setEditor(null); }}>
      <div className="form-wide"><Label htmlFor="commitment-description">Descrição</Label><Input id="commitment-description" required value={editor.input.description} onChange={event => change({ description: event.target.value })} /></div>
      <div><Label htmlFor="commitment-amount">{editor.kind === 'recorrente' ? 'Valor por ciclo' : 'Valor de cada parcela'}</Label><CurrencyInput id="commitment-amount" required value={editor.input.amount} onChange={amount => change({ amount })} /></div>
      <div><Label htmlFor="commitment-group">Grupo</Label><Select value={editor.input.group} onValueChange={group => change({ group: group as CommitmentInput['group'] })}><SelectTrigger id="commitment-group"><SelectValue /></SelectTrigger><SelectContent>{orderedGroups.filter(g => isExpenseNatureCompatible(g.id, editor.kind, groupsMap) || g.id === editor.input.group).map(group => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label htmlFor="commitment-category">Categoria</Label><Select value={editor.input.categoryId} onValueChange={categoryId => change({ categoryId })}><SelectTrigger id="commitment-category"><SelectValue placeholder="Selecionar categoria" /></SelectTrigger><SelectContent>{Object.values(domain.state.categories).filter(value => value.active || value.id === editor.oldCategory).map(value => <SelectItem key={value.id} value={value.id}>{value.name}{value.active ? '' : ' (inativa)'}</SelectItem>)}</SelectContent></Select></div>
      <div><Label htmlFor="commitment-payment">Forma de pagamento</Label><Select value={editor.input.paymentMethodId} onValueChange={paymentMethodId => change({ paymentMethodId })}><SelectTrigger id="commitment-payment"><SelectValue placeholder="Selecionar pagamento" /></SelectTrigger><SelectContent>{Object.values(domain.state.paymentMethods).filter(value => value.active || value.id === editor.oldPayment).map(value => <SelectItem key={value.id} value={value.id}>{value.name}{value.active ? '' : ' (inativa)'}</SelectItem>)}</SelectContent></Select></div>
      {(!editor.id || editor.kind === 'parcelado') && <div><Label htmlFor="commitment-start">{editor.id ? 'Ciclo da próxima parcela' : editor.kind === 'parcelado' ? 'Ciclo da primeira parcela' : 'Primeiro ciclo'}</Label><Input id="commitment-start" type="month" required min={editor.id ? effective.slice(0, 7) : undefined} value={editor.input.startCycleId.slice(0, 7)} onChange={event => change({ startCycleId: `${event.target.value}-04` })} /></div>}
      <div><Label htmlFor="commitment-count">{editor.kind === 'recorrente' ? 'Dia do vencimento' : 'Quantidade total de parcelas'}</Label><Input id="commitment-count" type="number" min={1} max={editor.kind === 'recorrente' ? 31 : undefined} required value={editor.kind === 'recorrente' ? editor.input.dayOfMonth : editor.input.totalInstallments} onChange={event => change(editor.kind === 'recorrente' ? { dayOfMonth: Number(event.target.value) } : { totalInstallments: Number(event.target.value) })} /></div>
      <div className="form-wide"><Label htmlFor="commitment-note">Observação (opcional)</Label><Input id="commitment-note" value={editor.input.note ?? ''} onChange={event => change({ note: event.target.value })} /></div>
      <DialogFooter className="form-actions"><Button type="button" variant="outline" onClick={() => setEditor(null)}>Cancelar</Button><Button type="submit" disabled={domain.readOnly}>Salvar</Button></DialogFooter>
    </form>}</DialogContent></Dialog>
    <Dialog open={pending !== null} onOpenChange={open => { if (!open) setPending(null); }}><DialogContent><DialogHeader><DialogTitle>{pending?.status === 'suspensa' ? 'Suspender recorrência?' : pending?.status === 'ativa' ? 'Retomar recorrência?' : 'Encerrar compromisso?'}</DialogTitle><DialogDescription>{pending?.description} · A partir de {cycleLabel(effective)}. Histórico preservado.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setPending(null)}>Cancelar</Button><Button disabled={domain.readOnly} onClick={() => { if (pending && domain.mutate(state => reviseCommitment(state, pending.kind, pending.id, effective, undefined, pending.status))) setPending(null); }}>Confirmar alteração</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={anticipation !== null} onOpenChange={open => { if (!open) setAnticipation(null); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FastForward className="h-5 w-5 text-primary" />
            Antecipar ou quitar parcelas
          </DialogTitle>
          <DialogDescription>
            {anticipation?.description} · {anticipation?.remaining} parcela(s) futura(s) a partir de {cycleLabel(effective)}. O histórico passado será preservado.
          </DialogDescription>
        </DialogHeader>
        {anticipation && (
          <form
            className="finance-form"
            onSubmit={event => {
              event.preventDefault();
              if (
                domain.mutate(state =>
                  anticipateInstallment(state, {
                    definitionId: anticipation.id,
                    selectedCycleId: cycleId,
                    targetCycleId: anticipation.targetCycleId,
                    count: anticipation.count,
                    paidAmount: anticipation.paidAmount,
                    note: anticipation.note,
                    todayCycle: today,
                  })
                )
              ) {
                setAnticipation(null);
              }
            }}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="anticipation-count">Parcelas a antecipar</Label>
                {anticipation.count !== anticipation.remaining && (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() =>
                      setAnticipation({
                        ...anticipation,
                        count: anticipation.remaining,
                        paidAmount: roundMoney(anticipation.installmentAmount * anticipation.remaining),
                      })
                    }
                  >
                    Quitar tudo ({anticipation.remaining})
                  </button>
                )}
              </div>
              <Input
                id="anticipation-count"
                type="number"
                min={1}
                max={anticipation.remaining}
                required
                value={anticipation.count}
                onChange={event => {
                  const nextCount = Math.max(1, Math.min(anticipation.remaining, Number(event.target.value) || 1));
                  setAnticipation({
                    ...anticipation,
                    count: nextCount,
                    paidAmount: roundMoney(anticipation.installmentAmount * nextCount),
                  });
                }}
              />
            </div>

            <div>
              <Label htmlFor="anticipation-cycle">Ciclo do pagamento</Label>
              <Input
                id="anticipation-cycle"
                type="month"
                required
                value={anticipation.targetCycleId.slice(0, 7)}
                onChange={event => setAnticipation({ ...anticipation, targetCycleId: `${event.target.value}-04` })}
              />
            </div>

            <div className="form-wide">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="anticipation-amount">Valor total pago (com ou sem desconto)</Label>
                {anticipation.paidAmount < roundMoney(anticipation.installmentAmount * anticipation.count) && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    Economia de {formatCurrency(roundMoney(anticipation.installmentAmount * anticipation.count - anticipation.paidAmount))}
                  </span>
                )}
              </div>
              <CurrencyInput
                id="anticipation-amount"
                required
                value={anticipation.paidAmount}
                onChange={paidAmount => setAnticipation({ ...anticipation, paidAmount })}
              />
            </div>

            <div className="form-wide">
              <Label htmlFor="anticipation-note">Observação (opcional)</Label>
              <Input
                id="anticipation-note"
                value={anticipation.note}
                placeholder="Ex.: Desconto por antecipação no cartão"
                onChange={event => setAnticipation({ ...anticipation, note: event.target.value })}
              />
            </div>

            <DialogFooter className="form-actions">
              <Button type="button" variant="outline" onClick={() => setAnticipation(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={domain.readOnly}>
                {anticipation.count === anticipation.remaining ? 'Quitar parcelamento' : `Antecipar ${anticipation.count}x`}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  </section>;
}