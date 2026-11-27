import { useState } from 'react';
import { ArrowDown, ArrowUp, HelpCircle, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { useExpenseDomain } from '@/hooks/useExpenseDomain';
import {
  deleteUnusedCatalogRecord,
  getOrderedBudgetGroups,
  isCatalogRecordUsed,
  reorderBudgetGroups,
  saveBudgetGroup,
  saveExpenseCatalogRecord,
  type BudgetGroupRecord,
  type ExpenseNature,
  type PaymentMethod,
} from '@/lib/expenseDomain';
import type { FinanceBackup } from '@/lib/backup';
import { BackupControls } from '@/components/BackupControls';
import { getGroupColorStyles, getGroupIcon, groupColorOptions, groupIconOptions } from '@/components/budgetGroupStyles';

const paymentTypes: Record<NonNullable<PaymentMethod['type']>, string> = {
  cartao_credito: 'Cartão de crédito',
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  outros: 'Outros',
};

const natureLabels = {
  avulso: 'Avulso',
  recorrente: 'Recorrente',
  parcelado: 'Parcelado',
} as const;

export function SettingsSection({
  domain,
  planningPlans,
  exportBackup,
  restoreBackup,
  onOpenOnboarding,
}: {
  domain: ReturnType<typeof useExpenseDomain>;
  planningPlans: Record<string, { distribution: Record<string, number> }>;
  exportBackup: () => FinanceBackup;
  restoreBackup: (backup: FinanceBackup) => { legacy: boolean };
  onOpenOnboarding?: () => void;
}) {
  const [subTab, setSubTab] = useState<'groups' | 'categories' | 'paymentMethods' | 'backup'>('groups');
  const [groupDraft, setGroupDraft] = useState<{
    id?: string;
    name: string;
    icon: string;
    color: BudgetGroupRecord['color'];
    active: boolean;
    allowedNatures: ExpenseNature[];
  } | null>(null);

  const [catalogDraft, setCatalogDraft] = useState<{
    id?: string;
    name: string;
    active: boolean;
    type: PaymentMethod['type'];
  } | null>(null);

  const allGroups = getOrderedBudgetGroups(domain.state, true);
  const editableGroups = allGroups.filter(g => !g.isResidual && g.id !== 'diarias');
  const residualGroup = allGroups.find(g => g.isResidual || g.id === 'diarias');

  const moveGroup = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= editableGroups.length) return;
    const ids = editableGroups.map(g => g.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    domain.mutate(state => reorderBudgetGroups(state, ids));
  };

  return (
    <section aria-label="Configurações" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Settings2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Configurações</h2>
            <p className="text-xs text-muted-foreground">Gerencie grupos, categorias, pagamentos e cópias de segurança</p>
          </div>
        </div>
        {onOpenOnboarding && (
          <Button type="button" variant="outline" size="sm" onClick={onOpenOnboarding}>
            <HelpCircle className="mr-1.5 h-4 w-4" />
            Como funciona
          </Button>
        )}
      </div>

      {domain.readOnly && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível recuperar as despesas. Os dados originais foram preservados; alterações estão suspensas.
        </div>
      )}

      <Tabs
        value={subTab}
        onValueChange={v => {
          setSubTab(v as typeof subTab);
          setGroupDraft(null);
          setCatalogDraft(null);
        }}
        className="space-y-4"
      >
        <TabsList className="grid h-auto w-full max-w-lg grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1 shadow-card sm:grid-cols-4">
          <TabsTrigger value="groups" className="rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-secondary/70">
            Grupos
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-secondary/70">
            Categorias
          </TabsTrigger>
          <TabsTrigger value="paymentMethods" className="rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-secondary/70">
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="backup" className="rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-secondary/70">
            Backup
          </TabsTrigger>
        </TabsList>

        {/* Sub-aba 1: Grupos Orçamentários */}
        <TabsContent value="groups">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold">Grupos orçamentários</h3>
                <p className="text-xs text-muted-foreground">
                  Reordene, inative, crie novos grupos e escolha quais tipos de gasto cada grupo aceita.
                </p>
              </div>
              <Button
                size="sm"
                disabled={domain.readOnly}
                onClick={() =>
                  setGroupDraft({
                    name: '',
                    icon: 'paw',
                    color: 'cyan',
                    active: true,
                    allowedNatures: ['avulso', 'recorrente', 'parcelado'],
                  })
                }
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Novo grupo
              </Button>
            </div>

            {groupDraft && (
              <form
                className="space-y-4 rounded-xl border border-border bg-secondary/40 p-4"
                onSubmit={event => {
                  event.preventDefault();
                  if (domain.mutate(state => saveBudgetGroup(state, groupDraft))) setGroupDraft(null);
                }}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="group-name">Nome do grupo</Label>
                    <Input
                      id="group-name"
                      required
                      placeholder="Ex: Pet, Educação, Lazer"
                      value={groupDraft.name}
                      onChange={e => setGroupDraft({ ...groupDraft, name: e.target.value })}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="group-icon">Ícone</Label>
                    <Select value={groupDraft.icon} onValueChange={icon => setGroupDraft({ ...groupDraft, icon })}>
                      <SelectTrigger id="group-icon">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {groupIconOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="group-color">Cor do card</Label>
                    <Select
                      value={groupDraft.color}
                      onValueChange={color => setGroupDraft({ ...groupDraft, color: color as BudgetGroupRecord['color'] })}
                    >
                      <SelectTrigger id="group-color">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {groupColorOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipos de gasto aceitos neste grupo</Label>
                  <div className="flex flex-wrap gap-3">
                    {(['avulso', 'recorrente', 'parcelado'] as const).map(natureKey => {
                      const checked = groupDraft.allowedNatures.includes(natureKey);
                      const isOnlyOne = checked && groupDraft.allowedNatures.length === 1;
                      return (
                        <label
                          key={natureKey}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary/50"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={isOnlyOne}
                            onCheckedChange={next => {
                              const shouldAdd = next === true;
                              const updated = shouldAdd
                                ? [...groupDraft.allowedNatures, natureKey]
                                : groupDraft.allowedNatures.filter(n => n !== natureKey);
                              if (updated.length > 0) {
                                setGroupDraft({ ...groupDraft, allowedNatures: updated });
                              }
                            }}
                          />
                          <span>{natureLabels[natureKey]}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Selecione pelo menos 1 tipo. O botão + Adicionar do grupo abrirá os campos conforme essa escolha.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={domain.readOnly}>Salvar grupo</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setGroupDraft(null)}>Cancelar</Button>
                </div>
              </form>
            )}

            <ul className="divide-y divide-border">
              {editableGroups.map((group, index) => {
                const Icon = getGroupIcon(group.icon);
                const styles = getGroupColorStyles(group.color);
                const used = isCatalogRecordUsed(domain.state, 'budgetGroups', group.id, planningPlans);
                return (
                  <li key={group.id} className={`flex flex-wrap items-center justify-between gap-3 py-3.5 ${group.active ? '' : 'opacity-60'}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.badgeClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.allowedNatures.map(n => natureLabels[n]).join(', ')} · {group.active ? 'Ativo' : 'Inativo'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        disabled={domain.readOnly || index === 0}
                        aria-label={`Subir ${group.name}`}
                        title="Subir na ordem"
                        onClick={() => moveGroup(index, -1)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        disabled={domain.readOnly || index === editableGroups.length - 1}
                        aria-label={`Descer ${group.name}`}
                        title="Descer na ordem"
                        onClick={() => moveGroup(index, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        disabled={domain.readOnly}
                        aria-label={`Editar ${group.name}`}
                        title={`Editar ${group.name}`}
                        onClick={() =>
                          setGroupDraft({
                            id: group.id,
                            name: group.name,
                            icon: group.icon,
                            color: group.color,
                            active: group.active,
                            allowedNatures: [...group.allowedNatures],
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        disabled={domain.readOnly || used}
                        aria-label={`Excluir ${group.name}`}
                        title={used ? 'Já utilizado no histórico; use inativar' : `Excluir ${group.name}`}
                        onClick={() => domain.mutate(state => deleteUnusedCatalogRecord(state, 'budgetGroups', group.id, planningPlans))}
                      >
                        <Trash2 className={`h-4 w-4 ${used ? 'text-muted-foreground/40' : 'text-destructive'}`} />
                      </Button>
                      <Switch
                        checked={group.active}
                        aria-label={`Ativar ${group.name}`}
                        disabled={domain.readOnly}
                        onCheckedChange={active =>
                          domain.mutate(state => saveBudgetGroup(state, { id: group.id, name: group.name, icon: group.icon, color: group.color, active }))
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            {residualGroup && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                    {(() => {
                      const ResidualIcon = getGroupIcon(residualGroup.icon);
                      return <ResidualIcon className="h-4 w-4" />;
                    })()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{residualGroup.name}</span>
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                        Obrigatório · Residual
                      </span>
                    </div>
                    <p className="text-muted-foreground">Absorve automaticamente o restante do limite e alimenta o ritmo diário.</p>
                  </div>
                </div>
                <span className="font-medium text-muted-foreground">Sempre por último</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Sub-abas 2 e 3: Categorias e Pagamentos */}
        {(['categories', 'paymentMethods'] as const).map(key => {
          const records = Object.values(key === 'paymentMethods' ? domain.state.paymentMethods : domain.state.categories).map(record => ({
            id: record.id,
            name: record.name,
            active: record.active,
            type: key === 'paymentMethods' ? domain.state.paymentMethods[record.id]?.type : undefined,
          }));

          return (
            <TabsContent key={key} value={key}>
              <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold">{key === 'categories' ? 'Categorias de gastos' : 'Formas de pagamento'}</h3>
                    <p className="text-xs text-muted-foreground">
                      {key === 'categories'
                        ? 'Registros já usados em lançamentos podem ser inativados para preservar o histórico.'
                        : 'Cartões, Pix e contas disponíveis nos lançamentos.'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={domain.readOnly}
                    onClick={() => setCatalogDraft({ name: '', active: true, type: 'cartao_credito' })}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    {key === 'categories' ? 'Nova categoria' : 'Nova forma'}
                  </Button>
                </div>

                {catalogDraft && (
                  <form
                    className="space-y-3 rounded-xl border border-border bg-secondary/40 p-4"
                    onSubmit={event => {
                      event.preventDefault();
                      if (domain.mutate(state => saveExpenseCatalogRecord(state, key, catalogDraft))) setCatalogDraft(null);
                    }}
                  >
                    <div>
                      <Label htmlFor="settings-catalog-name">Nome</Label>
                      <Input
                        id="settings-catalog-name"
                        value={catalogDraft.name}
                        onChange={e => setCatalogDraft({ ...catalogDraft, name: e.target.value })}
                        required
                        autoFocus
                      />
                    </div>
                    {key === 'paymentMethods' && (
                      <div>
                        <Label htmlFor="settings-payment-type">Tipo de pagamento</Label>
                        <Select
                          value={catalogDraft.type}
                          onValueChange={type => setCatalogDraft({ ...catalogDraft, type: type as PaymentMethod['type'] })}
                        >
                          <SelectTrigger id="settings-payment-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(paymentTypes).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={domain.readOnly}>Salvar</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setCatalogDraft(null)}>Cancelar</Button>
                    </div>
                  </form>
                )}

                <div className="divide-y divide-border">
                  {records.map(record => {
                    const used = isCatalogRecordUsed(domain.state, key, record.id);
                    return (
                      <div key={record.id} className={`flex items-center gap-2 py-3 ${record.active ? '' : 'opacity-60'}`}>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium">{record.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {record.active ? 'Ativo' : 'Inativo'}
                            {record.type ? ` · ${paymentTypes[record.type]}` : ''}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${record.name}`}
                          title={`Editar ${record.name}`}
                          disabled={domain.readOnly}
                          onClick={() => setCatalogDraft({ id: record.id, name: record.name, active: record.active, type: record.type ?? 'cartao_credito' })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Excluir ${record.name}`}
                          title={used ? 'Já utilizado no histórico; use inativar' : `Excluir ${record.name}`}
                          disabled={domain.readOnly || used}
                          onClick={() => domain.mutate(state => deleteUnusedCatalogRecord(state, key, record.id))}
                        >
                          <Trash2 className={`h-4 w-4 ${used ? 'text-muted-foreground/40' : 'text-destructive'}`} />
                        </Button>
                        <Switch
                          checked={record.active}
                          aria-label={`Ativar ${record.name}`}
                          disabled={domain.readOnly || record.id === 'category-investimento'}
                          onCheckedChange={active => domain.mutate(state => saveExpenseCatalogRecord(state, key, { ...record, active }))}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          );
        })}

        {/* Sub-aba 4: Backup e Portabilidade */}
        <TabsContent value="backup">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div>
              <h3 className="text-sm font-bold">Exportar e restaurar dados</h3>
              <p className="text-xs text-muted-foreground">
                Baixe uma cópia completa em JSON para portabilidade ou restaure um arquivo de backup anterior (v1, v2 ou v3).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <BackupControls exportBackup={exportBackup} restoreBackup={restoreBackup} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
