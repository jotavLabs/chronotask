import { supabase } from '@/lib/supabase';
import { mergeChanges } from '@/lib/sync';
import {
  SYNC_TABLES,
  applyRemoteChanges,
  clearSyncState,
  getChangesSince,
  getCursor,
  setCursor,
  setLastSyncAt,
  setSyncUserId,
} from '@/repositories/syncRepo';
import type { SyncRecord } from '@/repositories/syncRepo';

const EPOCH = '1970-01-01T00:00:00.000Z';
const NOT_CONFIGURED = 'Supabase não configurado (.env ausente).';

export type Account = { id: string; email: string | null };
export type SyncResult = { ok: true; pushed: number; pulled: number } | { ok: false; error: string };

export async function getAccount(): Promise<Account | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, email: u.email ?? null } : null;
}

export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { ok: false, error: error.message };
  if (data.user) setSyncUserId(data.user.id);
  return { ok: true };
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
  clearSyncState();
}

/**
 * One full reconciliation pass. For each table: pull remote rows changed since the
 * cursor, merge last-write-wins against local changes, apply winners locally and push
 * local winners. The cursor only advances on success, so a failed/offline run simply
 * leaves the pending changes to be retried next time (implicit offline queue).
 */
export async function syncNow(): Promise<SyncResult> {
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };
  const account = await getAccount();
  if (!account) return { ok: false, error: 'Faça login para sincronizar.' };

  const cursor = getCursor();
  const remoteFloor = cursor ?? EPOCH;
  let pushed = 0;
  let pulled = 0;
  let maxSeen = cursor ?? '';

  for (const table of SYNC_TABLES) {
    const { data, error } = await supabase.from(table).select('*').gt('updated_at', remoteFloor);
    if (error) return { ok: false, error: `${table}: ${error.message}` };
    const remote = (data ?? []) as SyncRecord[];
    const local = getChangesSince(table, cursor);

    const { toApplyLocally, toPush } = mergeChanges(local, remote);

    if (toApplyLocally.length) {
      applyRemoteChanges(table, toApplyLocally);
      pulled += toApplyLocally.length;
    }
    if (toPush.length) {
      const payload = toPush.map((r) => ({ ...r, user_id: account.id }));
      const { error: upErr } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
      if (upErr) return { ok: false, error: `${table}: ${upErr.message}` };
      pushed += toPush.length;
    }

    for (const r of remote) if (r.updated_at && r.updated_at > maxSeen) maxSeen = r.updated_at;
    for (const r of local) if (r.updated_at && r.updated_at > maxSeen) maxSeen = r.updated_at;
  }

  if (maxSeen) setCursor(maxSeen);
  setLastSyncAt(new Date().toISOString());
  return { ok: true, pushed, pulled };
}
