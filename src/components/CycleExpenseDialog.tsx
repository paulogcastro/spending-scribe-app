import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { useExpenseDomain } from '@/hooks/useExpenseDomain';
import {
  addCommitment,
  addManualExpense,
  getOrderedBudgetGroups,
  updateManualExpense,
  type CommitmentKind,
  type ManualExpenseGroup,
  type ManualExpenseInput,
} from '@/lib/expenseDomain';

export interface CycleExpenseEditor {
  group: ManualExpenseGroup; id?: string; input: ManualExpenseInput;
  nature?: 'avulso' | CommitmentKind;
  schedule?: { startCycleId: string; dayOfMonth: number; totalInstallments: number };
}

export function CycleExpenseDialog({ editor, onChange, onClose, cycleId, periodLabel, domain }: {
  editor: CycleExpenseEditor | null; onChange: (editor: CycleExpenseEditor) => void; onClose: () => void;
  cycleId: string; periodLabel: string; domain: ReturnType<typeof useExpenseDomain>;
}) {
  const orderedGroups = getOrderedBudgetGroups(domain.state);
  const selectedGroupRecord = orderedGroups.find(g => g.id === editor?.group);
  const allowedNatures = selectedGroupRecord?.allowedNatures ?? ['avulso'];

  const change = (updates: Partial<ManualExpenseInput>) => { if (editor) onChange({ ...editor, input: { ...editor.input, ...updates } }); };
  const rawNature = editor && !editor.id ? editor.nature ?? allowedNatures[0] : 'avulso';
  const nature: 'avulso' | CommitmentKind = allowedNatures.includes(rawNature) ? rawNature : allowedNatures[0];
  const schedule = editor?.schedule ?? { startCycleId: cycleId, dayOfMonth: 5, totalInstallments: 2 };
  const changeSchedule = (updates: Partial<typeof schedule>) => { if (editor) onChange({ ...editor, schedule: { ...schedule, ...updates } }); };
  const editingItem = editor?.id ? domain.state.cycles[cycleId]?.find(item => item.id === editor.id) : undefined;

  return (
    <Dialog open={editor !== null} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editor?.id ? 'Editar despesa' : 'Nova despesa'}</DialogTitle>
          <DialogDescription>
            {periodLabel} · {nature === 'avulso' ? 'Despesa avulsa' : nature === 'recorrente' ? 'Recorrente' : 'Parcelado'}
          </DialogDescription>
        </DialogHeader>
        {editor && (
          <form
            className="finance-form"
            onSubmit={event => {
              event.preventDefault();
              const { id, group, input } = editor;
              if (domain.mutate(state => {
                if (id) return updateManualExpense(state, cycleId, id, input);
                if (nature === 'avulso') return addManualExpense(state, cycleId, group, input);
                return addCommitment(state, nature, {
                  description: input.description, amount: input.amount, categoryId: input.categoryId,
                  paymentMethodId: input.paymentMethodId, note: input.note, group, ...schedule,
                });
              })) onClose();
            }}
          >
            <div className="form-wide">
              <Label htmlFor="cycle-expense-description">Descrição</Label>
              <Input className="h-11" id="cycle-expense-description" required value={editor.input.description} onChange={event => change({ description: event.target.value })} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cycle-expense-group">Grupo</Label>
              <Select
                disabled={Boolean(editor.id)}
                value={editor.group}
                onValueChange={groupId => {
                  const target = orderedGroups.find(item => item.id === groupId);
                  if (!target) return;
                  const nextNature = target.allowedNatures.includes(nature) ? nature : target.allowedNatures[0];
                  onChange({ ...editor, group: target.id, nature: nextNature });
                }}
              >
                <SelectTrigger className="h-11" id="cycle-expense-group"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {orderedGroups.map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!editor.id && allowedNatures.length > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="cycle-expense-nature">Tipo de despesa</Label>
                <Select
                  value={nature}
                  onValueChange={value => {
                    if (value === 'avulso' || value === 'recorrente' || value === 'parcelado') {
                      onChange({ ...editor, nature: value });
                    }
                  }}
                >
                  <SelectTrigger className="h-11" id="cycle-expense-nature"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allowedNatures.includes('avulso') && <SelectItem value="avulso">Avulsa</SelectItem>}
                    {allowedNatures.includes('recorrente') && <SelectItem value="recorrente">Recorrente</SelectItem>}
                    {allowedNatures.includes('parcelado') && <SelectItem value="parcelado">Parcelada</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="form-wide grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cycle-expense-amount">
                  {nature === 'parcelado' ? 'Valor de cada parcela' : nature === 'recorrente' ? 'Valor de referência' : 'Valor'}
                </Label>
                <CurrencyInput className="h-11" id="cycle-expense-amount" value={editor.input.amount} onChange={amount => change({ amount })} required />
              </div>
              {nature === 'avulso' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="cycle-expense-date">Data</Label>
                  <Input className="h-11" id="cycle-expense-date" type="date" required value={editor.input.date} onChange={event => change({ date: event.target.value })} />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="cycle-expense-start">{nature === 'parcelado' ? 'Ciclo da primeira parcela' : 'Ciclo inicial'}</Label>
                  <Input className="h-11" id="cycle-expense-start" type="month" required value={schedule.startCycleId.slice(0, 7)} onChange={event => changeSchedule({ startCycleId: `${event.target.value}-04` })} />
                </div>
              )}
            </div>
            {nature !== 'avulso' && (
              <div className="space-y-1.5">
                <Label htmlFor="cycle-expense-count">{nature === 'recorrente' ? 'Dia de referência' : 'Quantidade total de parcelas'}</Label>
                <Input
                  className="h-11"
                  id="cycle-expense-count"
                  type="number"
                  min={1}
                  max={nature === 'recorrente' ? 31 : undefined}
                  step={1}
                  required
                  value={nature === 'recorrente' ? schedule.dayOfMonth : schedule.totalInstallments}
                  onChange={event => changeSchedule(nature === 'recorrente' ? { dayOfMonth: Number(event.target.value) } : { totalInstallments: Number(event.target.value) })}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="cycle-expense-category">Categoria</Label>
              <Select value={editor.input.categoryId} onValueChange={categoryId => change({ categoryId })}>
                <SelectTrigger className="h-11" id="cycle-expense-category"><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                <SelectContent>
                  {Object.values(domain.state.categories)
                    .filter(item => item.active || item.id === editingItem?.categoryId)
                    .map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.name}{item.active ? '' : ' (inativa)'}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cycle-expense-payment">Forma de pagamento</Label>
              <Select value={editor.input.paymentMethodId} onValueChange={paymentMethodId => change({ paymentMethodId })}>
                <SelectTrigger className="h-11" id="cycle-expense-payment"><SelectValue placeholder="Selecionar pagamento" /></SelectTrigger>
                <SelectContent>
                  {Object.values(domain.state.paymentMethods)
                    .filter(item => item.active || item.id === editingItem?.paymentMethodId)
                    .map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.name}{item.active ? '' : ' (inativa)'}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-wide">
              <Label htmlFor="cycle-expense-note">Observação (opcional)</Label>
              <Input className="h-11" id="cycle-expense-note" value={editor.input.note ?? ''} onChange={event => change({ note: event.target.value })} />
            </div>
            <DialogFooter className="form-actions">
              <Button className="h-11" type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button className="h-11" type="submit" disabled={domain.readOnly}>Salvar despesa</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}