import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { deleteSetting, getSetting, setSetting } from '@/repositories/settingsRepo';
import { splitChunks } from './chunk';

// expo-secure-store encripta cada valor no hardware (Android Keystore / iOS Keychain),
// mas cada valor é limitado (~2KB no Android). A sessão do Supabase (JWT + user) pode
// passar disso, então quebramos em pedaços (ver lib/chunk). Layout para uma chave
// lógica K: `${K}.n` = quantidade de pedaços; `${K}.0..n-1` = os pedaços, em ordem.
const isWeb = Platform.OS === 'web';
// Token acessível após o primeiro desbloqueio pós-boot — permite refresh em segundo
// plano, mas fica inacessível/cifrado antes disso e não vaza em backups utilizáveis.
const ACCESSIBLE = SecureStore.AFTER_FIRST_UNLOCK;

async function nativeGet(key: string): Promise<string | null> {
  const meta = await SecureStore.getItemAsync(`${key}.n`);
  if (meta == null) return null;
  const n = parseInt(meta, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  let out = '';
  for (let i = 0; i < n; i++) {
    const part = await SecureStore.getItemAsync(`${key}.${i}`);
    if (part == null) return null; // pedaço faltando → trata como sem sessão
    out += part;
  }
  return out;
}

async function nativeRemove(key: string): Promise<void> {
  const meta = await SecureStore.getItemAsync(`${key}.n`);
  const n = meta ? parseInt(meta, 10) : 0;
  for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
  await SecureStore.deleteItemAsync(`${key}.n`);
}

async function nativeSet(key: string, value: string): Promise<void> {
  await nativeRemove(key); // limpa pedaços antigos antes de regravar
  const chunks = splitChunks(value);
  for (let i = 0; i < chunks.length; i++) {
    await SecureStore.setItemAsync(`${key}.${i}`, chunks[i], { keychainAccessible: ACCESSIBLE });
  }
  await SecureStore.setItemAsync(`${key}.n`, String(chunks.length), { keychainAccessible: ACCESSIBLE });
}

/**
 * Armazenamento da sessão de auth do cliente Supabase. No aparelho, os tokens ficam
 * no keystore com respaldo de hardware (Android Keystore / iOS Keychain) via
 * expo-secure-store, fatiados para driblar o limite por valor. Na web (sem SecureStore)
 * cai na tabela local `settings` do SQLite, mantendo o comportamento anterior.
 */
export const secureAuthStorage = {
  getItem: (key: string): Promise<string | null> =>
    isWeb ? Promise.resolve(getSetting(key)) : nativeGet(key),
  setItem: (key: string, value: string): Promise<void> => {
    if (isWeb) {
      setSetting(key, value);
      return Promise.resolve();
    }
    return nativeSet(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    if (isWeb) {
      deleteSetting(key);
      return Promise.resolve();
    }
    return nativeRemove(key);
  },
};
