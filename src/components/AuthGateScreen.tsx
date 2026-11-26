import { useState } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { useCloudAuth } from '@/hooks/useCloudAuth';

export function AuthGateScreen({ auth }: { auth: ReturnType<typeof useCloudAuth> }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await auth.signIn(email.trim(), password);
        toast.success('Login realizado com sucesso!');
      } else {
        const res = await auth.signUp(email.trim(), password);
        if (res.needsConfirmation) {
          toast.success('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
        } else {
          toast.success('Conta criada e conectada!');
        }
      }
      setPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível autenticar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await auth.signInWithGoogle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível iniciar login com Google.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Wallet className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">DinDin Flow</h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Entre para acessar seus ciclos financeiros na nuvem'
                : 'Crie sua conta gratuita para salvar seus dados na nuvem'}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-2.5 font-semibold"
            disabled={googleLoading || submitting}
            onClick={() => void handleGoogle()}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                />
              </svg>
            )}
            Continuar com Google
          </Button>

          <div className="relative flex items-center justify-center">
            <span className="w-full border-t border-border" />
            <span className="bg-card px-3 text-xs text-muted-foreground">ou com e-mail</span>
            <span className="w-full border-t border-border" />
          </div>

          <form className="space-y-4" onSubmit={e => void handleEmailSubmit(e)}>
            <div className="space-y-1.5">
              <Label htmlFor="gate-email">E-mail</Label>
              <Input
                id="gate-email"
                type="email"
                required
                placeholder="voce@exemplo.com"
                className="h-11"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gate-password">Senha</Label>
              <Input
                id="gate-password"
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="h-11"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="h-11 w-full font-semibold" disabled={submitting || googleLoading}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Ainda não tem conta? Criar conta gratuita' : 'Já tem uma conta? Entrar'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
