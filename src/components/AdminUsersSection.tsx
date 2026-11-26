import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, CheckCircle2, Loader2, RefreshCw, Search, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  fetchManagedUsers,
  setManagedUserStatus,
  type ManagedUserAccount,
} from '@/lib/adminUsers';

type StatusFilter = 'all' | 'active' | 'blocked';

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdminUsersSection({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<ManagedUserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<ManagedUserAccount | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const loadUsers = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const list = await fetchManagedUsers();
      setUsers(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar contas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const counts = useMemo(() => {
    const active = users.filter((u) => u.status === 'active').length;
    const blocked = users.filter((u) => u.status === 'blocked').length;
    return { total: users.length, active, blocked };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter !== 'all' && u.status !== filter) return false;
      if (query && !u.email.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [users, filter, search]);

  const handleConfirmBlock = async () => {
    if (!blockTarget) return;
    setBusyUserId(blockTarget.userId);
    try {
      await setManagedUserStatus(blockTarget.userId, 'blocked', blockReason);
      toast.success(`Conta ${blockTarget.email} bloqueada.`);
      setBlockTarget(null);
      setBlockReason('');
      await loadUsers(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível bloquear a conta.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleReactivate = async (account: ManagedUserAccount) => {
    setBusyUserId(account.userId);
    try {
      await setManagedUserStatus(account.userId, 'active');
      toast.success(`Conta ${account.email} reativada.`);
      await loadUsers(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível reativar a conta.');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5 text-primary" />
              Total de contas
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{counts.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Contas ativas
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{counts.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <Ban className="h-3.5 w-3.5 text-destructive" />
              Contas bloqueadas
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{counts.blocked}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" />
                Controle de contas
              </CardTitle>
              <CardDescription>
                Visualize contas cadastradas, último acesso e bloqueie ou reative o acesso ao app.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refreshing || loading}
              onClick={() => void loadUsers(true)}
              className="self-start sm:self-auto"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por e-mail..."
                className="pl-9"
              />
            </div>

            <div className="inline-flex rounded-xl border border-border bg-secondary/40 p-1">
              {(
                [
                  { id: 'all', label: 'Todas' },
                  { id: 'active', label: 'Ativas' },
                  { id: 'blocked', label: 'Bloqueadas' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    filter === item.id
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Carregando contas...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Nenhuma conta encontrada para o filtro atual.
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border">
              {filteredUsers.map((account) => {
                const isSelf = account.userId === currentUserId;
                const isBusy = busyUserId === account.userId;
                const isBlocked = account.status === 'blocked';

                return (
                  <div
                    key={account.userId}
                    className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {account.email || '(sem e-mail)'}
                        </span>
                        {account.role === 'admin' && (
                          <Badge variant="secondary" className="text-[11px]">
                            Admin
                          </Badge>
                        )}
                        {isSelf && (
                          <Badge variant="outline" className="text-[11px]">
                            Você
                          </Badge>
                        )}
                        <Badge
                          variant={isBlocked ? 'destructive' : 'outline'}
                          className={
                            isBlocked
                              ? 'text-[11px]'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-300'
                          }
                        >
                          {isBlocked ? 'Bloqueada' : 'Ativa'}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Cadastro: {formatDateTime(account.createdAt)}</span>
                        <span>Último acesso: {formatDateTime(account.lastSeenAt)}</span>
                      </div>

                      {isBlocked && account.blockedReason && (
                        <p className="text-xs text-destructive">Motivo: {account.blockedReason}</p>
                      )}
                    </div>

                    {!isSelf && (
                      <div className="shrink-0">
                        {isBlocked ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => void handleReactivate(account)}
                            className="w-full sm:w-auto"
                          >
                            {isBusy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            Reativar
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => {
                              setBlockTarget(account);
                              setBlockReason('');
                            }}
                            className="w-full sm:w-auto"
                          >
                            <Ban className="mr-1.5 h-3.5 w-3.5" />
                            Bloquear
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(blockTarget)} onOpenChange={(open) => !open && setBlockTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bloquear acesso da conta?</DialogTitle>
            <DialogDescription>
              A conta <strong>{blockTarget?.email}</strong> não poderá acessar nem sincronizar dados até ser reativada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="block-reason">Motivo (opcional)</Label>
            <Input
              id="block-reason"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Ex.: Acesso de teste encerrado"
              maxLength={160}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setBlockTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busyUserId !== null}
              onClick={() => void handleConfirmBlock()}
            >
              {busyUserId && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Confirmar bloqueio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
