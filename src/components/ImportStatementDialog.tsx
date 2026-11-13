import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DailyCategory, DailyExpense, PaymentSource, dailyCategoryLabels, dailyCategoryIcons, paymentSourceLabels } from '@/types/finance';
import { parseBankFile, makeKey, suggestCategory, rememberCategory } from '@/lib/bankImport';
import { formatCurrency, formatDate } from '@/lib/format';
import { Upload } from 'lucide-react';

interface Row { key: string; date: string; description: string; amount: number; category: DailyCategory; selected: boolean; duplicate: boolean }

interface Props {
  existing: DailyExpense[];
  onImport: (items: { description: string; amount: number; category: DailyCategory; source: PaymentSource; date: string; importKey: string }[]) => void;
}

export function ImportStatementDialog({ existing, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [source, setSource] = useState<PaymentSource>('inter_credito');
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setError('');
    try {
      const buf = await file.arrayBuffer();
      let text = new TextDecoder('utf-8').decode(buf);
      if (text.includes('\uFFFD')) text = new TextDecoder('windows-1252').decode(buf);
      const parsed = parseBankFile(file.name, text);
      const known = new Set(existing.map(e => e.importKey || makeKey(e.date, e.description, e.amount)));
      setRows(parsed.map(t => {
        const duplicate = known.has(t.key);
        return { ...t, category: suggestCategory(t.description), selected: !duplicate, duplicate };
      }));
      if (!parsed.length) setError('Nenhum gasto encontrado no arquivo.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.');
      setRows([]);
    }
  };

  const confirm = () => {
    const chosen = rows.filter(r => r.selected);
    chosen.forEach(r => rememberCategory(r.description, r.category));
    onImport(chosen.map(r => ({ description: r.description, amount: r.amount, category: r.category, source, date: r.date, importKey: r.key })));
    setOpen(false);
    setRows([]);
  };

  const update = (key: string, u: Partial<Row>) => setRows(rs => rs.map(r => r.key === key ? { ...r, ...u } : r));
  const selected = rows.filter(r => r.selected);
  const dupCount = rows.filter(r => r.duplicate).length;

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} title="Importar extrato (CSV/OFX)">
        <Upload className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setRows([]); setError(''); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importar extrato do Inter</DialogTitle>
            <DialogDescription>Envie o arquivo CSV ou OFX exportado do app. Gastos já importados são ignorados automaticamente.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-3">
            <input type="file" accept=".csv,.ofx,text/csv" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} className="text-sm" />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Fonte:</span>
              <Select value={source} onValueChange={v => setSource(v as PaymentSource)}>
                <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentSourceLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {rows.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">{rows.length} gastos encontrados{dupCount ? ` · ${dupCount} já registrados (desmarcados)` : ''}</p>
              <div className="max-h-[50vh] overflow-y-auto border rounded-md divide-y">
                {rows.map(r => (
                  <div key={r.key} className={`flex items-center gap-2 p-2 text-sm ${r.duplicate ? 'opacity-50' : ''}`}>
                    <Checkbox checked={r.selected} onCheckedChange={c => update(r.key, { selected: !!c })} />
                    <span className="w-20 text-xs text-muted-foreground">{formatDate(r.date)}</span>
                    <span className="flex-1 truncate" title={r.description}>{r.description}{r.duplicate && <em className="ml-1 text-xs">(já importado)</em>}</span>
                    <Select value={r.category} onValueChange={v => update(r.key, { category: v as DailyCategory })}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(dailyCategoryLabels).map(([k, l]) => <SelectItem key={k} value={k}>{dailyCategoryIcons[k as DailyCategory]} {l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <span className="w-24 text-right font-medium">{formatCurrency(r.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={confirm} disabled={!selected.length}>
              Importar {selected.length} ({formatCurrency(selected.reduce((s, r) => s + r.amount, 0))})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
