import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adjacentCycle, getFinancialCycle, loadCycleState, saveCycleState, selectFinancialCycle } from '@/lib/financialCycles';

export function useFinancialCycles() {
  const [initial] = useState(() => {
    try {
      return { state: loadCycleState(localStorage), error: false };
    } catch {
      const cycle = getFinancialCycle();
      return { state: { version: 1 as const, selectedCycleId: cycle.id, cycles: { [cycle.id]: cycle } }, error: true };
    }
  });
  const [state, setState] = useState(initial.state);

  useEffect(() => {
    if (initial.error) {
      toast.error('Não foi possível recuperar os ciclos. Os dados armazenados foram preservados.');
      return;
    }
    try { saveCycleState(localStorage, initial.state); }
    catch { toast.error('Não foi possível salvar os ciclos neste navegador.'); }
  }, [initial]);

  const navigate = (direction: -1 | 1) => {
    if (initial.error) {
      toast.error('A navegação foi suspensa para preservar os ciclos armazenados.');
      return;
    }
    const next = selectFinancialCycle(state, adjacentCycle(state.selectedCycleId, direction));
    try {
      saveCycleState(localStorage, next);
      setState(next);
    } catch { toast.error('Não foi possível salvar o ciclo. A seleção anterior foi mantida.'); }
  };

  return { cycle: state.cycles[state.selectedCycleId], navigate };
}