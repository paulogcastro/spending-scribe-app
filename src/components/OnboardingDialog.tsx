import { useState } from 'react';
import { CalendarRange, PiggyBank, Settings2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BrandLogo } from '@/components/BrandLogo';

export const ONBOARDING_STORAGE_KEY = 'dindin-onboarding-done-v1';

const steps = [
  {
    icon: CalendarRange,
    title: 'Orçamento por ciclos, não extrato bancário',
    description:
      'O DinDin Flow organiza sua vida financeira em ciclos mensais (a partir do dia 4). Em vez de tentar reproduzir o saldo do banco, você planeja sua renda e acompanha o quanto ainda pode gastar no ciclo.',
    tip: 'Comece na guia Planejamento informando sua renda e meta de investimento.',
  },
  {
    icon: Target,
    title: 'Limites por grupo e ritmo diário',
    description:
      'Divida seu limite de despesas entre seus grupos (Casa, Carro, Fixos, Parcelados) por percentual ou valor em reais. O restante vai automaticamente para Gastos diários, calculando quanto você pode gastar por dia.',
    tip: 'Quanto mais longe do limite de gastos você ficar, mais folga e investimento extra no fim do ciclo.',
  },
  {
    icon: Settings2,
    title: 'Recorrências e personalização completa',
    description:
      'Despesas recorrentes e parceladas avançam sozinhas para os próximos ciclos. Na guia Configurações, você cria, reordena ou inativa grupos, categorias e formas de pagamento do seu jeito.',
    tip: 'Seus dados ficam salvos na sua conta na nuvem e funcionam também instalados no celular (PWA).',
  },
] as const;

export function OnboardingDialog({
  open,
  onClose,
  onStartPlanning,
}: {
  open: boolean;
  onClose: () => void;
  onStartPlanning?: () => void;
}) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  const finish = (goToPlanning = false) => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    setStep(0);
    onClose();
    if (goToPlanning && onStartPlanning) onStartPlanning();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) finish(false);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader className="items-center text-center">
          <BrandLogo size="lg" />
          <DialogTitle className="pt-2 text-lg">Bem-vindo ao DinDin Flow</DialogTitle>
          <DialogDescription className="text-xs">
            Passo {step + 1} de {steps.length}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-col items-center space-y-3 rounded-2xl border border-border bg-secondary/40 p-5 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">{current.title}</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">{current.description}</p>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-foreground">
            <PiggyBank className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{current.tip}</span>
          </div>

          <div className="flex justify-center gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === step ? 'w-6 bg-primary' : 'w-1.5 bg-border'
                }`}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => finish(false)}>
            Pular
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
                Anterior
              </Button>
            )}
            {isLast ? (
              <Button type="button" size="sm" onClick={() => finish(true)}>
                Ir para Planejamento
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => setStep(s => s + 1)}>
                Próximo
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
