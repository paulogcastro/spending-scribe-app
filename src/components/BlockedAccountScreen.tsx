import { LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLogo } from '@/components/BrandLogo';
import type { useCloudAuth } from '@/hooks/useCloudAuth';

export function BlockedAccountScreen({ auth }: { auth: ReturnType<typeof useCloudAuth> }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-6 flex items-center gap-3">
        <BrandLogo size="lg" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">DinDin Flow</h1>
          <p className="text-xs text-muted-foreground">Controle de gastos pessoais</p>
        </div>
      </div>

      <Card className="w-full max-w-md border-destructive/30 shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg">Acesso temporariamente suspenso</CardTitle>
          <CardDescription>
            A conta <strong className="text-foreground">{auth.user?.email}</strong> está desativada no momento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {auth.profile?.blockedReason && (
            <div className="rounded-xl border border-border bg-secondary/40 p-3 text-sm text-foreground">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Motivo informado</p>
              <p className="mt-1">{auth.profile.blockedReason}</p>
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Se você acredita que isso foi um engano, entre em contato com o administrador do aplicativo.
          </p>
          <Button variant="outline" className="w-full gap-2" onClick={() => void auth.signOut()}>
            <LogOut className="h-4 w-4" />
            Sair desta conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
