import { useEffect, useState } from 'react';
import { Car, Home, Receipt, Plus, Pencil, Trash2, Repeat2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExpenseDomain } from '@/hooks/useExpenseDomain';
import { addManualExpense, updateManualExpense, removeManualExpense, localExpenseDate, generateCycleCommitments, plannedCommitments, correctCommitmentOccurrence, type ExpenseOccurrence, type ManualExpenseInput, type ManualExpenseGroup } from '@/lib/expenseDomain';
import { formatCurrency, formatDate } from '@/lib/format';
import { ExpenseCatalogs } from '@/components/ExpenseCatalogs';
import { CycleCommitments } from '@/components/CycleCommitments';
import { getFinancialCycle } from '@/lib/financialCycles';

const areas = [{ group: 'carro', label: 'Carro', icon: Car }, { group: 'casa', label: 'Casa', icon: Home }, { group: 'fixos', label: 'Gastos fixos', icon: Repeat2 }, { group: 'parcelados', label: 'Parcelados', icon: CreditCard }, { group: 'diarias', label: 'Gastos diários', icon: Receipt }] as const;
interface Editor { group: ManualExpenseGroup; id?: string; input: ManualExpenseInput }
export function CycleExpenses({ cycleId, periodLabel }: { cycleId: string; periodLabel: string }) {
  const domain = useExpenseDomain();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pending, setPending] = useState<ExpenseOccurrence | null>(null);
  const [correction, setCorrection] = useState<{ item: ExpenseOccurrence; amount: number } | null>(null);
  const todayCycle = getFinancialCycle().id;
  const { mutate } = domain;
  useEffect(() => { mutate(state => generateCycleCommitments(state, cycleId, todayCycle)); }, [mutate, cycleId, todayCycle, domain.state]);
  const realized = domain.state.cycles[cycleId] ?? [];
  const projected = cycleId > todayCycle ? plannedCommitments(domain.state, cycleId).filter(item => !realized.some(value => value.definitionId === item.definitionId)) : [];
  const start = (group: ManualExpenseGroup, item?: ExpenseOccurrence) => setEditor({ group, id: item?.id, input: item ? { description: item.description, amount: item.amount, categoryId: item.categoryId, paymentMethodId: item.paymentMethodId, date: item.date, note: item.note ?? '' } : { description: '', amount: 0, categoryId: '', paymentMethodId: '', date: localExpenseDate(), note: '' } });
  const change = (updates: Partial<ManualExpenseInput>) => { if (editor) setEditor({ ...editor, input: { ...editor.input, ...updates } }); };
  const editingItem = editor?.id ? domain.state.cycles[cycleId]?.find(value => value.id === editor.id) : undefined;
  return <section aria-label="Despesas do ciclo" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Lançamentos do ciclo</h2><ExpenseCatalogs domain={domain} /></div>
    {domain.readOnly && <p role="alert" className="text-sm text-destructive">Não foi possível recuperar as despesas. Os dados originais foram preservados; alterações estão suspensas.</p>}
    {areas.map(({ group, label, icon: Icon }) => {
      const items = [...realized, ...projected].filter(item => item.group === group).sort((a, b) => b.date.localeCompare(a.date));
      const total = realized.filter(item => item.group === group).reduce((sum, value) => sum + value.amount, 0);
      const forecast = projected.filter(item => item.group === group).reduce((sum, value) => sum + value.amount, 0);
      return <section key={group} aria-label={`${label} do ciclo`} className="border-t border-border pt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-primary" />{label}</h3><div className="flex flex-wrap items-center gap-3"><span className="text-sm font-semibold tabular-nums">{formatCurrency(total)}{forecast > 0 && <span className="ml-2 font-normal text-muted-foreground">Previsto: {formatCurrency(forecast)}</span>}</span>{(group === 'carro' || group === 'casa' || group === 'diarias') && <Button variant="outline" size="sm" disabled={domain.readOnly} onClick={() => start(group)} aria-label={`Adicionar despesa em ${label}`}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>}</div></div>
        {items.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nenhum lançamento neste grupo.</p> : <ul className="divide-y divide-border">{items.map(item => <li key={item.id} className="flex items-start gap-2 py-3">
          <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{item.description}</p><p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">{item.nature === 'recorrente' ? <Repeat2 className="h-3 w-3 text-primary" /> : item.nature === 'parcelado' ? <CreditCard className="h-3 w-3 text-primary" /> : <Receipt className="h-3 w-3" />}{item.installment ? `Parcela ${item.installment.number}/${item.installment.total}` : item.nature === 'recorrente' ? 'Recorrente' : 'Avulso'}{projected.includes(item) ? ' · Previsto' : ''}</p><p className="mt-1 break-words text-xs text-muted-foreground">{formatDate(item.date)} {item.date.slice(0, 4)} · {domain.state.categories[item.categoryId]?.name} · {domain.state.paymentMethods[item.paymentMethodId]?.name}</p>{item.note && <p className="mt-1 break-words text-xs text-muted-foreground">{item.note}</p>}</div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1"><span className="mr-1 text-sm font-medium tabular-nums">{formatCurrency(item.amount)}</span><Button variant="ghost" size="icon" className="h-8 w-8" title={`Editar ${item.description}`} aria-label={`Editar despesa ${item.description}`} disabled={domain.readOnly || projected.includes(item)} onClick={() => { if (item.nature !== 'avulso') setCorrection({ item, amount: item.amount }); else if (group === 'carro' || group === 'casa' || group === 'diarias') start(group, item); }}><Pencil className="h-4 w-4" /></Button>{item.nature === 'avulso' && <Button variant="ghost" size="icon" className="h-8 w-8" title={`Excluir ${item.description}`} aria-label={`Excluir despesa ${item.description}`} disabled={domain.readOnly} onClick={() => setPending(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>
        </li>)}</ul>}
      </section>;
    })}
    <CycleCommitments domain={domain} cycleId={cycleId} />
    <Dialog open={correction !== null} onOpenChange={open => { if (!open) setCorrection(null); }}><DialogContent><DialogHeader><DialogTitle>Corrigir valor neste ciclo</DialogTitle><DialogDescription>{correction?.item.description} · {periodLabel}. O valor dos outros ciclos permanece inalterado.</DialogDescription></DialogHeader>{correction && <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (domain.mutate(state => correctCommitmentOccurrence(state, cycleId, correction.item.id, correction.amount))) setCorrection(null); }}><div><Label htmlFor="occurrence-amount">Valor desta ocorrência</Label><CurrencyInput id="occurrence-amount" value={correction.amount} onChange={amount => setCorrection({ ...correction, amount })} required /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setCorrection(null)}>Cancelar</Button><Button type="submit" disabled={domain.readOnly}>Salvar correção</Button></DialogFooter></form>}</DialogContent></Dialog>
    <Dialog open={editor !== null} onOpenChange={open => { if (!open) setEditor(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editor?.id ? 'Editar despesa' : 'Adicionar despesa'} · {areas.find(value => value.group === editor?.group)?.label}</DialogTitle><DialogDescription>{periodLabel}</DialogDescription></DialogHeader>
      {editor && <form className="space-y-4" onSubmit={event => { event.preventDefault(); const { id, group, input } = editor; if (domain.mutate(state => id ? updateManualExpense(state, cycleId, id, input) : addManualExpense(state, cycleId, group, input))) setEditor(null); }}>
        <div><Label htmlFor="cycle-expense-description">Descrição</Label><Input id="cycle-expense-description" required value={editor.input.description} onChange={e => change({ description: e.target.value })} autoFocus /></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><Label htmlFor="cycle-expense-amount">Valor</Label><CurrencyInput id="cycle-expense-amount" value={editor.input.amount} onChange={amount => change({ amount })} required /></div><div><Label htmlFor="cycle-expense-date">Data</Label><Input id="cycle-expense-date" type="date" required value={editor.input.date} onChange={e => change({ date: e.target.value })} /></div></div>
        <div><Label htmlFor="cycle-expense-category">Categoria</Label><Select value={editor.input.categoryId} onValueChange={categoryId => change({ categoryId })}><SelectTrigger id="cycle-expense-category"><SelectValue placeholder="Selecionar categoria" /></SelectTrigger><SelectContent>{Object.values(domain.state.categories).filter(value => value.active || value.id === editingItem?.categoryId).map(value => <SelectItem key={value.id} value={value.id}>{value.name}{value.active ? '' : ' (inativa)'}</SelectItem>)}</SelectContent></Select></div>
        <div><Label htmlFor="cycle-expense-payment">Forma de pagamento</Label><Select value={editor.input.paymentMethodId} onValueChange={paymentMethodId => change({ paymentMethodId })}><SelectTrigger id="cycle-expense-payment"><SelectValue placeholder="Selecionar pagamento" /></SelectTrigger><SelectContent>{Object.values(domain.state.paymentMethods).filter(value => value.active || value.id === editingItem?.paymentMethodId).map(value => <SelectItem key={value.id} value={value.id}>{value.name}{value.active ? '' : ' (inativa)'}</SelectItem>)}</SelectContent></Select></div>
        <div><Label htmlFor="cycle-expense-note">Observação</Label><Input id="cycle-expense-note" value={editor.input.note ?? ''} onChange={e => change({ note: e.target.value })} /></div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setEditor(null)}>Cancelar</Button><Button type="submit" disabled={domain.readOnly}>Salvar despesa</Button></DialogFooter>
      </form>}
    </DialogContent></Dialog>
    <Dialog open={pending !== null} onOpenChange={open => { if (!open) setPending(null); }}><DialogContent><DialogHeader><DialogTitle>Excluir despesa?</DialogTitle><DialogDescription>{pending?.description} · {formatCurrency(pending?.amount ?? 0)}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setPending(null)}>Cancelar</Button><Button variant="destructive" disabled={domain.readOnly} onClick={() => { if (pending && domain.mutate(state => removeManualExpense(state, cycleId, pending.id))) setPending(null); }}>Confirmar exclusão</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}