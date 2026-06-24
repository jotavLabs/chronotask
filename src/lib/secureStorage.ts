import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { deleteSetting, getSetting, setSetting } from '@/repositories/settingsRepo';
import { splitChunks } from './chunk';

// expo-secure-store é módulo nativo e pode não existir no runtime atual (dev client ou
// Expo Go anteriores ao rebuild que inclui o módulo). Carregamos com guarda; se ausente,
// caímos na tabela SQLite `settings` — o app não quebra, só não usa o keystore por ora.
// No próximo build com o módulo, o token passa a ficar no Keychain/Keystore.
let Secure: typeof import('expo-secure-store') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Secure = require('expo-secure-store') as typeof import('expo-secure-store');
} catch {
  Secure = null;
}

const useSecure = Secure != null && Platform.OS !== 'web';

/** Fallback: tabela SQLite local `settings` (web, ou runtime sem o módulo nativo). */
const sqliteStorage = {
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

/**
 * SecureStore (Keychain / Android Keystore), cifrado por hardware. O SecureStore limita
 * cada valor a ~2KB e a sessão do Supabase pode passar disso, então fatiamos: `${key}.n`
 * guarda a contagem e `${key}.i` cada pedaço. setItem limpa os pedaços antigos antes.
 */
function makeSecureStorage(S: NonNullable<typeof Secure>) {
  // Acessível após o 1º desbloqueio pós-boot (permite refresh em background, fica
  // cifrado/inacessível antes disso e fora de backups utilizáveis).
  const opts = { keychainAccessible: S.AFTER_FIRST_UNLOCK };

  async function clear(key: string): Promise<void> {
    const meta = await S.getItemAsync(`${key}.n`);
    const n = meta ? parseInt(meta, 10) : 0;
    for (let i = 0; i < n; i++) await S.deleteItemAsync(`${key}.${i}`);
    await S.deleteItemAsync(`${key}.n`);
  }

  return {
    getItem: async (key: string): Promise<string | null> => {
      const meta = await S.getItemAsync(`${key}.n`);
      if (meta == null) return null;
      const n = parseInt(meta, 10);
      if (!Number.isFinite(n) || n <= 0) return null;
      let value = '';
      for (let i = 0; i < n; i++) {
        const part = await S.getItemAsync(`${key}.${i}`);
        if (part == null) return null; // pedaço faltando → trata como sem sessão
        value += part;
      }
      return value;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      await clear(key); // limpa pedaços antigos antes de regravar
      const chunks = splitChunks(value);
      for (let i = 0; i < chunks.length; i++) await S.setItemAsync(`${key}.${i}`, chunks[i], opts);
      await S.setItemAsync(`${key}.n`, String(chunks.length), opts);
    },
    removeItem: (key: string): Promise<void> => clear(key),
  };
}

/**
 * Armazenamento da sessão de auth do cliente Supabase. Usa o keystore com respaldo de
 * hardware quando o módulo nativo está presente; senão (web ou binário sem o módulo),
 * cai no SQLite local — mantendo o app funcional sem rebuild.
 */
export const secureAuthStorage = useSecure ? makeSecureStorage(Secure as NonNullable<typeof Secure>) : sqliteStorage;
