import { useRef, useState } from 'react';
import { Download, Upload, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { parseBackup, isLegacyBackup, type FinanceBackup } from '@/lib/backup';
import { toast } from 'sonner';

export function BackupControls({ exportBackup, restoreBackup }: { exportBackup: () => FinanceBackup; restoreBackup: (backup: FinanceBackup) => { legacy: boolean } }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<FinanceBackup | null>(null);
  const download = () => {
    try {
      const backup = exportBackup();
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = `controle-gastos-backup-${backup.exportedAt.slice(0, 10)}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Backup completo exportado (meses, ciclos e planejamentos).');
    } catch { toast.error('Não foi possível exportar o backup.'); }
  };
  const load = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Arquivo muito grande.');
      setPending(parseBackup(await file.text()));
    } catch { toast.error('Backup inválido. Seus dados atuais não foram alterados.'); }
    if (input.current) input.current.value = '';
  };
  return <>
    <Button size="icon" variant="outline" aria-label="Exportar backup" title="Exportar backup" onClick={download}><Download className="h-4 w-4" /></Button>
    <Button size="icon" variant="outline" aria-label="Restaurar backup" title="Restaurar backup" onClick={() => input.current?.click()}><Upload className="h-4 w-4" /></Button>
    <input ref={input} className="hidden" type="file" accept=".json,application/json" aria-label="Arquivo de backup" onChange={event => void load(event.target.files?.[0])} />
    <Dialog open={pending !== null} onOpenChange={open => { if (!open) setPending(null); }}>
      <DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Restaurar cópia de segurança?</DialogTitle>
        <DialogDescription>Este backup contém {pending ? Object.keys(pending.months).length : 0} meses{pending && !isLegacyBackup(pending) ? ` e ${Object.keys(pending.cyclePlanning!.plans).length} planejamentos de ciclo` : ''}. {pending && isLegacyBackup(pending) ? 'É um backup antigo, sem planejamento por ciclo: os dados mensais serão substituídos e seus ciclos e planejamentos atuais serão preservados.' : 'A restauração substituirá todos os dados atuais deste navegador.'} Exporte um backup antes de continuar.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setPending(null)}>Cancelar</Button><Button onClick={() => {
          if (!pending) return;
          try { const { legacy } = restoreBackup(pending); setPending(null); toast.success(legacy ? 'Backup antigo restaurado. Ele não contém planejamento por ciclo; seus ciclos e planejamentos atuais foram preservados.' : 'Backup restaurado com sucesso.'); setTimeout(() => window.location.reload(), 2500); }
          catch { toast.error('Não foi possível salvar o backup. Seus dados anteriores foram preservados.'); }
        }}>Substituir e restaurar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}