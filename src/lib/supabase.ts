import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { deleteSetting, getSetting, setSetting } from '@/repositories/settingsRepo';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Whether .env supplied the Supabase URL + anon key. Telas degradam graciosamente quando false. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Auth session persisted in the local SQLite `settings` table — avoids pulling in
 * a native async-storage module just for token storage. Keeps the build JS-only.
 */
const sqliteAuthStorage = {
  getItem: (key: string): Promise<string | null> => Promise.resolve(getSetting(key)),
  setItem: (key: string, value: string): Promise<void> => {
    setSetting(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    deleteSetting(key);
    return Promise.resolve();
  },
};

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        storage: sqliteAuthStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
