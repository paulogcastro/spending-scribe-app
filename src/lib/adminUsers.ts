import { supabase } from '@/lib/supabase';

export type UserRole = 'user' | 'admin';
export type UserAccessStatus = 'active' | 'blocked';

export interface UserProfileSummary {
  role: UserRole;
  status: UserAccessStatus;
  blockedReason: string | null;
}

export interface ManagedUserAccount {
  userId: string;
  email: string;
  role: UserRole;
  status: UserAccessStatus;
  blockedReason: string | null;
  createdAt: string;
  lastSeenAt: string;
}

interface TouchProfileRow {
  role?: string;
  status?: string;
  blocked_reason?: string | null;
}

interface AdminUserRow {
  user_id: string;
  email: string;
  role: string;
  status: string;
  blocked_reason: string | null;
  created_at: string;
  last_seen_at: string;
}

const DEFAULT_PROFILE: UserProfileSummary = {
  role: 'user',
  status: 'active',
  blockedReason: null,
};

export async function touchMyProfile(): Promise<UserProfileSummary> {
  if (!supabase) return DEFAULT_PROFILE;

  const { data, error } = await supabase.rpc('touch_my_profile');
  if (error) {
    // Fallback seguro caso o schema SQL atualizado ainda não tenha sido aplicado no Supabase
    console.warn('touch_my_profile unavailable:', error.message);
    return DEFAULT_PROFILE;
  }

  const row = (Array.isArray(data) ? data[0] : data) as TouchProfileRow | null | undefined;
  if (!row) return DEFAULT_PROFILE;

  return {
    role: row.role === 'admin' ? 'admin' : 'user',
    status: row.status === 'blocked' ? 'blocked' : 'active',
    blockedReason: row.blocked_reason ?? null,
  };
}

export async function fetchManagedUsers(): Promise<ManagedUserAccount[]> {
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw new Error(error.message);

  const rows = (Array.isArray(data) ? data : []) as AdminUserRow[];
  return rows.map((row) => ({
    userId: row.user_id,
    email: row.email,
    role: row.role === 'admin' ? 'admin' : 'user',
    status: row.status === 'blocked' ? 'blocked' : 'active',
    blockedReason: row.blocked_reason ?? null,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  }));
}

export async function setManagedUserStatus(
  targetUserId: string,
  newStatus: UserAccessStatus,
  reason?: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado.');

  const { error } = await supabase.rpc('admin_set_user_status', {
    target_user_id: targetUserId,
    new_status: newStatus,
    reason: reason?.trim() ? reason.trim() : null,
  });

  if (error) throw new Error(error.message);
}
