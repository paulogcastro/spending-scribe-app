import { useEffect, useState, useCallback } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const TOUR_STORAGE_KEY = 'dindin-tour-done-v1';

export type TourTab = 'cycle-expenses' | 'planning' | 'settings';

interface TourStep {
  target: string;
  tab: TourTab;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="income-card"]',
    tab: 'planning',
    title: '1. Cadastre sua renda do ciclo',
    description:
      'Informe o Salário planejado (que define seus limites de gasto) e o Salário recebido (que entra no saldo disponível). Se forem iguais, use o atalho "Igual ao planejado".',
  },
  {
    target: '[data-tour="investment-card"]',
    tab: 'planning',
    title: '2. Defina sua meta de investimento',
    description:
      'Reserve quanto deseja investir neste ciclo. No fim do ciclo, registre o valor aplicado de fato para acompanhar o quanto ficou acima ou abaixo da meta.',
  },
  {
    target: '[data-tour="distribution-card"]',
    tab: 'planning',
    title: '3. Distribua os limites por grupo',
    description:
      'Defina em % ou em R$ quanto cada grupo pode gastar. O restante vai automaticamente para Gastos diários, calculando seu ritmo por dia.',
  },
  {
    target: '[data-tour="new-expense-btn"]',
    tab: 'cycle-expenses',
    title: '4. Adicione suas despesas',
    description:
      'Clique aqui (ou no botão + dentro de cada grupo) para lançar despesas avulsas, recorrentes ou parceladas. Tudo pronto para começar!',
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function GuidedTour({
  open,
  onClose,
  onSelectTab,
}: {
  open: boolean;
  onClose: () => void;
  onSelectTab: (tab: TourTab) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const measureTarget = useCallback(() => {
    if (!open || !step) return;
    const el = document.querySelector(step.target);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [open, step]);

  useEffect(() => {
    if (!open || !step) return;
    onSelectTab(step.tab);

    const timer = window.setTimeout(() => {
      const el = document.querySelector(step.target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(measureTarget, 220);
      } else {
        setRect(null);
      }
    }, 80);

    return () => window.clearTimeout(timer);
  }, [open, stepIndex, step, onSelectTab, measureTarget]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [open, measureTarget]);

  if (!open || !step) return null;

  const finish = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, '1');
    setStepIndex(0);
    onClose();
  };

  // Posiciona o card flutuante abaixo ou acima do elemento destacado
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
  const cardWidth = Math.min(340, viewportWidth - 24);
  const showAbove = rect ? rect.top + rect.height + 210 > viewportHeight && rect.top > 200 : false;
  const cardTop = rect
    ? showAbove
      ? Math.max(16, rect.top - 196)
      : Math.min(viewportHeight - 200, rect.top + rect.height + 14)
    : Math.max(24, viewportHeight / 2 - 90);
  const cardLeft = rect
    ? Math.min(Math.max(12, rect.left + rect.width / 2 - cardWidth / 2), viewportWidth - cardWidth - 12)
    : Math.max(12, (viewportWidth - cardWidth) / 2);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* Backdrop clicável apenas se clicar fora; spotlight com box-shadow */}
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-2xl ring-2 ring-primary transition-all duration-200"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.58)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-black/60" />
      )}

      {/* Card flutuante de dica */}
      <div
        className="fixed z-50 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl transition-all duration-200"
        style={{ top: cardTop, left: cardLeft, width: cardWidth }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3 w-3" />
            Dica {stepIndex + 1} de {TOUR_STEPS.length}
          </span>
          <button
            type="button"
            onClick={finish}
            aria-label="Fechar tutorial"
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="text-sm font-bold">{step.title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{step.description}</p>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={finish}>
            Pular
          </Button>
          <div className="flex items-center gap-1.5">
            {stepIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setStepIndex(i => i - 1)}
              >
                Anterior
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                if (isLast) finish();
                else setStepIndex(i => i + 1);
              }}
            >
              {isLast ? 'Concluir' : 'Próximo'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
