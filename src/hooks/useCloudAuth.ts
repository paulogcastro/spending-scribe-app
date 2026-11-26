import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  applyCloudSnapshotToLocalStorage,
  fetchCloudFinanceData,
  hasMeaningfulLocalData,
  readLocalFinanceSnapshot,
  saveCloudFinanceData,
} from '@/lib/cloudSync';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

const HYDRATED_KEY = 'dindin-cloud-hydrated-user';

export function useCloudAuth(syncTriggerKey: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle');
  const [pendingMigration, setPendingMigration] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const readyToPushRef = useRef(false);

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
          window.location.reload();
        }
        return;
      }

      const localSnapshot = readLocalFinanceSnapshot();
      if (hasMeaningfulLocalData(localSnapshot)) {
        setPendingMigration(true);
        readyToPushRef.current = false;
      } else {
        await saveCloudFinanceData(signedUser.id, localSnapshot);
        sessionStorage.setItem(HYDRATED_KEY, signedUser.id);
        readyToPushRef.current = true;
        setSyncStatus('synced');
      }
    } catch {
      setSyncStatus('error');
      toast.error('Não foi possível sincronizar com a nuvem. Verifique se o SQL foi executado no Supabase.');
    }
  }, []);

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
        readyToPushRef.current = false;
        setPendingMigration(false);
        setSyncStatus('idle');
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [handleSignedInUser]);

  // Auto-sync local mutations to Supabase when authenticated and hydrated
  useEffect(() => {
    if (!supabase || !user || !readyToPushRef.current || pendingMigration) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setSyncStatus('syncing');
    debounceRef.current = window.setTimeout(async () => {
      try {
        const snapshot = readLocalFinanceSnapshot();
        await saveCloudFinanceData(user.id, snapshot);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
      }
    }, 700);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [user, syncTriggerKey, pendingMigration]);

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
      await saveCloudFinanceData(user.id, localSnapshot);
      sessionStorage.setItem(HYDRATED_KEY, user.id);
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
      await saveCloudFinanceData(user.id, { cycleState: null, cyclePlanning: null, expenseDomain: null });
      sessionStorage.setItem(HYDRATED_KEY, user.id);
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
