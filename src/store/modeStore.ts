import { create } from 'zustand';
import { getAppMode, setAppMode } from '@/repositories/settingsRepo';
import type { AppMode } from '@/repositories/settingsRepo';

interface ModeStore {
  mode: AppMode;
  init: () => void;
  setMode: (m: AppMode) => void;
}

/** App mode: 'agenda' (free placement, default) vs 'rotina' (adaptation engine + reorder). */
export const useModeStore = create<ModeStore>((set) => ({
  mode: 'agenda',
  init: () => set({ mode: getAppMode() }),
  setMode: (mode) => {
    setAppMode(mode);
    set({ mode });
  },
}));
