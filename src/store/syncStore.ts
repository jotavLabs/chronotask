import { create } from 'zustand';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getLastSyncAt } from '@/repositories/syncRepo';
import {
  getAccount,
  signIn as svcSignIn,
  signOut as svcSignOut,
  syncNow as svcSyncNow,
} from '@/services/syncService';
import type { Account } from '@/services/syncService';

type Status = 'idle' | 'syncing';

interface SyncStore {
  configured: boolean;
  account: Account | null;
  status: Status;
  lastSyncAt: string | null;
  lastError: string | null;
  /** Loads session + last-sync marker. Call on boot and when opening the account screen. */
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  configured: isSupabaseConfigured,
  account: null,
  status: 'idle',
  lastSyncAt: getLastSyncAt(),
  lastError: null,
  async refresh() {
    const account = await getAccount();
    set({ account, lastSyncAt: getLastSyncAt() });
  },
  async signIn(email, password) {
    const r = await svcSignIn(email, password);
    if (r.ok) await get().refresh();
    return r;
  },
  async signOut() {
    await svcSignOut();
    set({ account: null, lastSyncAt: null, lastError: null });
  },
  async syncNow() {
    if (get().status === 'syncing') return;
    set({ status: 'syncing', lastError: null });
    const r = await svcSyncNow();
    set({
      status: 'idle',
      lastSyncAt: getLastSyncAt(),
      lastError: r.ok ? null : r.error,
    });
    if (r.ok) await get().refresh();
  },
}));
