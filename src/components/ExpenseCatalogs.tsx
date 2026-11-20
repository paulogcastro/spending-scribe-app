import { useState } from 'react';
import { Plus, Pencil, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { saveExpenseCatalogRecord, type PaymentMethod } from '@/lib/expenseDomain';
import type { useExpenseDomain } from '@/hooks/useExpenseDomain';

const paymentTypes: Record<NonNullable<PaymentMethod['type']>, string> = { cartao_credito: 'Cartão de crédito', pix: 'Pix', dinheiro: 'Dinheiro', outros: 'Outros' };
export function ExpenseCatalogs({ domain }: { domain: ReturnType<typeof useExpenseDomain> }) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<'categories' | 'paymentMethods'>('categories');
  const [draft, setDraft] = useState<{ id?: string; name: string; active: boolean; type: PaymentMethod['type'] } | null>(null);
  const records = Object.values(catalog === 'paymentMethods' ? domain.state.paymentMethods : domain.state.categories).map(record => ({ id: record.id, name: record.name, active: record.active, type: catalog === 'paymentMethods' ? domain.state.paymentMethods[record.id]?.type : undefined }));
  return <>
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Settings2 className="mr-2 h-4 w-4" />Categorias e pagamentos</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Categorias e pagamentos</DialogTitle></DialogHeader>
        <Tabs value={catalog} onValueChange={value => { setCatalog(value as typeof catalog); setDraft(null); }}>
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="categories">Categorias</TabsTrigger><TabsTrigger value="paymentMethods">Pagamentos</TabsTrigger></TabsList>
          {(['categories', 'paymentMethods'] as const).map(key => <TabsContent key={key} value={key} className="space-y-3">
            <Button variant="outline" size="sm" disabled={domain.readOnly} onClick={() => setDraft({ name: '', active: true, type: 'cartao_credito' })}><Plus className="mr-2 h-4 w-4" />{key === 'categories' ? 'Nova categoria' : 'Nova forma de pagamento'}</Button>
            {draft && <form className="space-y-3 border-y border-border py-3" onSubmit={event => { event.preventDefault(); if (domain.mutate(state => saveExpenseCatalogRecord(state, key, draft))) setDraft(null); }}>
              <div><Label htmlFor="catalog-name">Nome</Label><Input id="catalog-name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} required autoFocus /></div>
              {key === 'paymentMethods' && <div><Label htmlFor="payment-type">Tipo de pagamento</Label><Select value={draft.type} onValueChange={type => setDraft({ ...draft, type: type as PaymentMethod['type'] })}><SelectTrigger id="payment-type"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(paymentTypes).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>}
              <div className="flex gap-2"><Button type="submit" disabled={domain.readOnly}>Salvar registro</Button><Button type="button" variant="outline" onClick={() => setDraft(null)}>Cancelar</Button></div>
            </form>}
            <div className="divide-y divide-border">{records.map(record => <div key={record.id} className="flex items-center gap-2 py-3">
              <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{record.name}</p><p className="text-xs text-muted-foreground">{record.active ? 'Ativo' : 'Inativo'}{record.type ? ` · ${paymentTypes[record.type]}` : ''}</p></div>
              <Button variant="ghost" size="icon" aria-label={`Editar ${record.name}`} title={`Editar ${record.name}`} disabled={domain.readOnly} onClick={() => setDraft({ id: record.id, name: record.name, active: record.active, type: record.type ?? 'cartao_credito' })}><Pencil className="h-4 w-4" /></Button>
              <Switch checked={record.active} aria-label={`Ativar ${record.name}`} disabled={domain.readOnly || record.id === 'category-investimento'} onCheckedChange={active => domain.mutate(state => saveExpenseCatalogRecord(state, key, { ...record, active }))} />
            </div>)}</div>
          </TabsContent>)}
        </Tabs>
      </DialogContent>
    </Dialog>
  </>;
}