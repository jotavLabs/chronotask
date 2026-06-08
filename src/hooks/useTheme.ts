import { useColorScheme } from 'nativewind';
import { tokensFor } from '@/lib/theme';
import type { Scheme, ThemeTokens } from '@/lib/theme';

/** Effective scheme ('light'|'dark') + matching tokens for inline styles. */
export function useTheme(): { scheme: Scheme; tokens: ThemeTokens } {
  const { colorScheme } = useColorScheme();
  const scheme: Scheme = colorScheme === 'dark' ? 'dark' : 'light';
  return { scheme, tokens: tokensFor(scheme) };
}
