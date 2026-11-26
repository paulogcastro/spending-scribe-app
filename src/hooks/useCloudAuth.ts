import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  applyCloudSnapshotToLocalStorage,
  fetchCloudFinanceData,
  fetchCloudUpdatedAt,
  hasMeaningfulLocalData,
  readLocalFinanceSnapshot,
  saveCloudFinanceData,
} from '@/lib/cloudSync';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

const HYDRATED_KEY = 'dindin-cloud-hydrated-user';
const LAST_UPDATED_KEY = 'dindin-cloud-last-updated-at';

export function useCloudAuth(syncTriggerKey: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle');
  const [pendingMigration, setPendingMigration] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const readyToPushRef = useRef(false);
  const lastUpdatedRef = useRef<string | null>(
    typeof window !== 'undefined' ? sessionStorage.getItem(LAST_UPDATED_KEY) : null
  );
  const lastFocusCheckRef = useRef(0);

  const recordUpdatedAt = useCallback((value?: string | null) => {
    lastUpdatedRef.current = value ?? null;
    if (value) sessionStorage.setItem(LAST_UPDATED_KEY, value);
    else sessionStorage.removeItem(LAST_UPDATED_KEY);
  }, []);

  const handleSignedInUser = useCallback(async (signedUser: User) => {
    try {
      const cloud = await fetchCloudFinanceData(signedUser.id);
      if (cloud && (cloud.cycleState || cloud.cyclePlanning || cloud.expenseDomain)) {
        const alreadyHydrated = sessionStorage.getItem(HYDRATED_KEY) === signedUser.id;
        readyToPushRef.current = true;
        setSyncStatus('synced');
        if (!alreadyHydrated) {
          applyCloudSnapshotToLocalStorage(cloud);
          sessionStorage.setItem(HYDRATED_KEY, signedUser.id);
          recordUpdatedAt(cloud.updatedAt ?? null);
          window.location.reload();
        } else if (!lastUpdatedRef.current && cloud.updatedAt) {
          recordUpdatedAt(cloud.updatedAt);
        }
        return;
      }

      const localSnapshot = readLocalFinanceSnapshot();
      if (hasMeaningfulLocalData(localSnapshot)) {
        setPendingMigration(true);
        readyToPushRef.current = false;
      } else {
        const result = await saveCloudFinanceData(signedUser.id, localSnapshot);
        sessionStorage.setItem(HYDRATED_KEY, signedUser.id);
        if (!result.conflict) recordUpdatedAt(result.updatedAt);
        readyToPushRef.current = true;
        setSyncStatus('synced');
      }
    } catch (err) {
      console.error('Cloud sync error:', err);
      setSyncStatus('error');
      const detail = err instanceof Error ? err.message : (typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : 'Erro desconhecido');
      toast.error(`Erro ao sincronizar com a nuvem: ${detail}`);
    }
  }, [recordUpdatedAt]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) void handleSignedInUser(currentUser);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (event === 'SIGNED_IN' && nextUser) {
        void handleSignedInUser(nextUser);
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(HYDRATED_KEY);
        recordUpdatedAt(null);
        readyToPushRef.current = false;
        setPendingMigration(false);
        setSyncStatus('idle');
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [handleSignedInUser, recordUpdatedAt]);

  // Auto-pull newer cloud changes when returning to tab/app (PC <-> Mobile sync)
  useEffect(() => {
    if (!supabase || !user || pendingMigration) return;

    const checkForUpdates = async () => {
      if (!readyToPushRef.current) return;
      const now = Date.now();
      if (now - lastFocusCheckRef.current < 10_000) return;
      lastFocusCheckRef.current = now;

      try {
        const serverUpdatedAt = await fetchCloudUpdatedAt(user.id);
        if (serverUpdatedAt && lastUpdatedRef.current && serverUpdatedAt > lastUpdatedRef.current) {
          const latest = await fetchCloudFinanceData(user.id);
          if (latest) {
            applyCloudSnapshotToLocalStorage(latest);
            recordUpdatedAt(latest.updatedAt ?? serverUpdatedAt);
            toast.info('Dados atualizados a partir de outro dispositivo.');
            window.setTimeout(() => window.location.reload(), 600);
          }
        }
      } catch {
        // Silent fail on background focus check
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void checkForUpdates();
    };
    const onFocus = () => void checkForUpdates();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [user, pendingMigration, recordUpdatedAt]);

  // Auto-sync local mutations to Supabase when authenticated and hydrated (with conflict protection)
  useEffect(() => {
    if (!supabase || !user || !readyToPushRef.current || pendingMigration) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setSyncStatus('syncing');
    debounceRef.current = window.setTimeout(async () => {
      try {
        const snapshot = readLocalFinanceSnapshot();
        const result = await saveCloudFinanceData(user.id, snapshot, lastUpdatedRef.current);
        if (result.conflict) {
          applyCloudSnapshotToLocalStorage(result.latest);
          recordUpdatedAt(result.latest.updatedAt ?? null);
          toast.warning('Encontramos uma alteração mais recente feita em outro dispositivo. Atualizando...');
          window.setTimeout(() => window.location.reload(), 900);
          return;
        }
        recordUpdatedAt(result.updatedAt);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
      }
    }, 700);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [user, syncTriggerKey, pendingMigration, recordUpdatedAt]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return { needsConfirmation: !data.session };
  };

  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    toast.success('Você saiu da sua conta.');
  };

  const migrateLocalToCloud = async () => {
    if (!user) return;
    try {
      setSyncStatus('syncing');
      const localSnapshot = readLocalFinanceSnapshot();
      const result = await saveCloudFinanceData(user.id, localSnapshot);
      sessionStorage.setItem(HYDRATED_KEY, user.id);
      if (!result.conflict) recordUpdatedAt(result.updatedAt);
      readyToPushRef.current = true;
      setPendingMigration(false);
      setSyncStatus('synced');
      toast.success('Seus dados locais foram salvos na nuvem!');
    } catch {
      setSyncStatus('error');
      toast.error('Erro ao enviar dados para a nuvem.');
    }
  };

  const skipMigrationAndStartFresh = async () => {
    if (!user) return;
    try {
      setSyncStatus('syncing');
      const result = await saveCloudFinanceData(user.id, { cycleState: null, cyclePlanning: null, expenseDomain: null });
      sessionStorage.setItem(HYDRATED_KEY, user.id);
      if (!result.conflict) recordUpdatedAt(result.updatedAt);
      readyToPushRef.current = true;
      setPendingMigration(false);
      setSyncStatus('synced');
      toast.success('Conta inicializada na nuvem.');
    } catch {
      setSyncStatus('error');
      toast.error('Erro ao inicializar conta na nuvem.');
    }
  };

  return {
    user,
    loading,
    syncStatus,
    pendingMigration,
    isConfigured: isSupabaseConfigured,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    migrateLocalToCloud,
    skipMigrationAndStartFresh,
  };
}
