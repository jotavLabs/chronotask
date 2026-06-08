// Centralized theme tokens (pure). Screens mostly use NativeWind `dark:` classes;
// these tokens are for the few places that need inline colors (style={{}}).

export type ThemeMode = 'light' | 'dark' | 'system';
export type Scheme = 'light' | 'dark';

export type ThemeTokens = {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  primary: string;
  border: string;
};

export const lightTokens: ThemeTokens = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  text: '#111827',
  textMuted: '#6B7280',
  primary: '#3B82F6',
  border: '#E5E7EB',
};

export const darkTokens: ThemeTokens = {
  background: '#0B1120',
  surface: '#111827',
  surfaceAlt: '#1F2937',
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  primary: '#60A5FA',
  border: '#1F2937',
};

export function tokensFor(scheme: Scheme): ThemeTokens {
  return scheme === 'dark' ? darkTokens : lightTokens;
}

export const THEME_MODES: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Claro', icon: '☀️' },
  { mode: 'dark', label: 'Escuro', icon: '🌙' },
  { mode: 'system', label: 'Seguir o sistema', icon: '⚙️' },
];

/** Category accent colors per scheme. The DB color is the light value; dark is a
 * brighter equivalent so accents stay legible on dark surfaces. */
const CATEGORY_DARK: Record<string, string> = {
  '#3B82F6': '#60A5FA', // Trabalho
  '#8B5CF6': '#A78BFA', // Sono
  '#6B7280': '#9CA3AF', // Rotina
  '#F59E0B': '#FBBF24', // Alimentação
  '#EF4444': '#F87171', // Treino
  '#10B981': '#34D399', // Estudo
  '#F97316': '#FB923C', // Cardio
  '#EC4899': '#F472B6', // Mobilidade
  '#06B6D4': '#22D3EE', // Lazer
  '#84CC16': '#A3E635', // Leitura
};

/** Resolves a category color (from DB) to the value for the given scheme. */
export function categoryColorFor(hex: string | null | undefined, scheme: Scheme): string {
  const base = hex ?? '#6B7280';
  if (scheme === 'light') return base;
  return CATEGORY_DARK[base.toUpperCase()] ?? CATEGORY_DARK[base] ?? base;
}
