import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createExpenseDomainState, loadExpenseDomainState, saveExpenseDomainState, type ExpenseDomainState } from '@/lib/expenseDomain';

export function useExpenseDomain() {
  const [initial] = useState(() => {
    try { return { state: loadExpenseDomainState(localStorage), error: false }; }
    catch { return { state: createExpenseDomainState(), error: true }; }
  });
  const [state, setState] = useState(initial.state);
  const current = useRef(initial.state);
  const mutate = useCallback((change: (state: ExpenseDomainState) => ExpenseDomainState): boolean => {
    if (initial.error) { toast.error('Os dados de despesas não puderam ser recuperados. O conteúdo original foi preservado.'); return false; }
    try {
      const next = change(current.current);
      if (next === current.current) return true;
      saveExpenseDomainState(localStorage, next);
      current.current = next;
      setState(next);
      return true;
    } catch (error) {
      toast.error(error instanceof Error && !('issues' in error) ? error.message : 'Confira descrição, data, categoria e forma de pagamento. Os dados anteriores foram mantidos.');
      return false;
    }
  }, [initial.error]);
  return { state, mutate, readOnly: initial.error };
}