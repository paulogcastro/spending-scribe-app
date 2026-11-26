import { useState } from 'react';
import { Cloud, CloudOff, Loader2, LogIn, LogOut, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { useCloudAuth } from '@/hooks/useCloudAuth';

export function AuthControls({ auth }: { auth: ReturnType<typeof useCloudAuth> }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!auth.isConfigured) {
    return (
      <span
        className="hidden items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs text-muted-foreground sm:inline-flex"
        title="Dados salvos apenas neste navegador"
      >
        <CloudOff className="h-3.5 w-3.5" />
        Modo local
      </span>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await auth.signIn(email.trim(), password);
        toast.success('Login realizado com sucesso!');
        setOpen(false);
      } else {
        const res = await auth.signUp(email.trim(), password);
        if (res.needsConfirmation) {
          toast.success('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
        } else {
          toast.success('Conta criada e conectada!');
        }
        setOpen(false);
      }
      setPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível autenticar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {auth.user ? (
        <div className="flex items-center gap-2">
          <span
            className="hidden items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs font-medium text-foreground sm:inline-flex"
            title={auth.user.email ?? 'Conta conectada'}
          >
            {auth.syncStatus === 'syncing' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <Cloud className={`h-3.5 w-3.5 ${auth.syncStatus === 'error' ? 'text-destructive' : 'text-primary'}`} />
            )}
            <span className="max-w-[140px] truncate">{auth.user.email}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void auth.signOut()}
            title="Sair da conta"
            aria-label="Sair da conta"
          >
            <LogOut className="mr-1.5 h-4 w-4" />
            <span>Sair</span>
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={auth.loading}
          onClick={() => setOpen(true)}
        >
          <LogIn className="mr-1.5 h-4 w-4" />
          Entrar
        </Button>
      )}

      {/* Modal Login / Cadastro */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{mode === 'login' ? 'Entrar no DinDin Flow' : 'Criar conta'}</DialogTitle>
            <DialogDescription>
              {mode === 'login'
                ? 'Acesse seus ciclos e despesas em qualquer dispositivo.'
                : 'Crie sua conta gratuita para salvar seus dados na nuvem.'}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={e => void handleSubmit(e)}>
            <div className="space-y-1.5">
              <Label htmlFor="auth-email">E-mail</Label>
              <Input
                id="auth-email"
                type="email"
                required
                placeholder="voce@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auth-password">Senha</Label>
              <Input
                id="auth-password"
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'login' ? 'Entrar' : 'Criar conta'}
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              >
                {mode === 'login' ? 'Ainda não tem conta? Criar conta' : 'Já tem conta? Entrar'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Migração Local -> Nuvem */}
      <Dialog open={auth.pendingMigration} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-primary" />
              Migrar dados locais para a nuvem?
            </DialogTitle>
            <DialogDescription>
              Encontramos ciclos, planejamentos ou despesas salvos neste navegador. Deseja enviar tudo para sua conta na nuvem?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => void auth.skipMigrationAndStartFresh()}>
              Começar vazio
            </Button>
            <Button onClick={() => void auth.migrateLocalToCloud()}>
              Enviar dados para a nuvem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
