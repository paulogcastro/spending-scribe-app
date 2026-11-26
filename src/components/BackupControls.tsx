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
      toast.success('Backup completo exportado (meses, ciclos, planejamentos e novo domínio de despesas).');
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
    <Button size="sm" variant="outline" onClick={download}>
      <Download className="mr-1.5 h-4 w-4" />
      Exportar backup
    </Button>
    <Button size="sm" variant="outline" onClick={() => input.current?.click()}>
      <Upload className="mr-1.5 h-4 w-4" />
      Restaurar backup
    </Button>
    <input ref={input} className="hidden" type="file" accept=".json,application/json" aria-label="Arquivo de backup" onChange={event => void load(event.target.files?.[0])} />
    <Dialog open={pending !== null} onOpenChange={open => { if (!open) setPending(null); }}>
      <DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Restaurar cópia de segurança?</DialogTitle>
        <DialogDescription>Este backup contém {pending ? Object.keys(pending.months).length : 0} meses{pending?.cyclePlanning ? ` e ${Object.keys(pending.cyclePlanning.plans).length} planejamentos de ciclo` : ''}. {pending && isLegacyBackup(pending) ? 'É um backup v1: os dados mensais serão substituídos; ciclos e planejamentos atuais serão preservados.' : 'Os meses, ciclos e planejamentos serão substituídos.'} {pending?.version === 3 ? 'O novo domínio de despesas também será substituído.' : 'O novo domínio de despesas atual será preservado, pois não consta neste backup antigo.'} Exporte um backup antes de continuar.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setPending(null)}>Cancelar</Button><Button onClick={() => {
          if (!pending) return;
          try { const { legacy } = restoreBackup(pending); const version = pending.version; setPending(null); toast.success(legacy ? 'Backup v1 restaurado. Ciclos, planejamentos e novo domínio de despesas foram preservados.' : version === 2 ? 'Backup v2 restaurado. O novo domínio de despesas foi preservado.' : 'Backup v3 restaurado com sucesso.'); setTimeout(() => window.location.reload(), 2500); }
          catch { toast.error('Não foi possível salvar o backup. Seus dados anteriores foram preservados.'); }
        }}>Substituir e restaurar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}