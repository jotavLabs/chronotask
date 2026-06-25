import { create } from 'zustand';
import {
  getShowStudies,
  getShowTraining,
  setShowStudies,
  setShowTraining,
} from '@/repositories/settingsRepo';

interface TabsStore {
  showTraining: boolean;
  showStudies: boolean;
  /** Loads saved visibility from settings. Call once after migrations. */
  init: () => void;
  setShowTraining: (v: boolean) => void;
  setShowStudies: (v: boolean) => void;
}

// Treino e Estudos ficam ocultos por padrão; o usuário habilita em Ajustes.
export const useTabsStore = create<TabsStore>((set) => ({
  showTraining: false,
  showStudies: false,
  init() {
    set({ showTraining: getShowTraining(), showStudies: getShowStudies() });
  },
  setShowTraining(v) {
    setShowTraining(v);
    set({ showTraining: v });
  },
  setShowStudies(v) {
    setShowStudies(v);
    set({ showStudies: v });
  },
}));
