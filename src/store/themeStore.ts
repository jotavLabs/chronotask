import { colorScheme } from 'nativewind';
import { create } from 'zustand';
import type { ThemeMode } from '@/lib/theme';
import { getThemeMode, setThemeMode } from '@/repositories/settingsRepo';

interface ThemeStore {
  mode: ThemeMode;
  /** Loads the saved mode and applies it to NativeWind. Call once on boot. */
  init: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: 'system',
  init() {
    const mode = getThemeMode();
    colorScheme.set(mode);
    set({ mode });
  },
  setMode(mode) {
    setThemeMode(mode);
    colorScheme.set(mode);
    set({ mode });
  },
}));
