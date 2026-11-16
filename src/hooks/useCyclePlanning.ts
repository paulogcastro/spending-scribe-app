import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { CyclePlanning } from '@/types/finance';
import { computePlanning, getCyclePlanning, loadPlanningState, savePlanningState, upsertPlanning } from '@/lib/cyclePlanning';

export function useCyclePlanning(cycleId: string) {
  const [initial] = useState(() => {
    try {
      return { state: loadPlanningState(localStorage), error: false };
    } catch {
      return { state: { version: 1 as const, plans: {} }, error: true };
    }
  });
  const [state, setState] = useState(initial.state);

  const planning = getCyclePlanning(state, cycleId);

  // Persiste a inicialização (própria ou copiada do ciclo anterior) uma única vez por ciclo.
  useEffect(() => {
    if (initial.error || state.plans[cycleId]) return;
    const next = upsertPlanning(state, planning);
    try {
      savePlanningState(localStorage, next);
      setState(next);
    } catch {
      toast.error('Não foi possível salvar o planejamento neste navegador.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId, initial.error]);

  const mutate = (change: (plan: CyclePlanning) => CyclePlanning) => {
    if (initial.error) {
      toast.error('O planejamento está em modo de leitura para preservar os dados armazenados.');
      return;
    }
    try {
      const next = upsertPlanning(state, change(planning));
      savePlanningState(localStorage, next);
      setState(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o planejamento.');
    }
  };

  return { planning, derived: computePlanning(planning), mutate, readOnly: initial.error };
}
