import { create } from 'zustand';
import type { BlockWithCategory } from '@/repositories/blocksRepo';
import { getBlocksForDay } from '@/repositories/blocksRepo';
import { getDoneBlockIds, setBlockDone } from '@/repositories/completionsRepo';
import { toIsoDate } from '@/lib/dayResolver';

interface DayData {
  blocks: BlockWithCategory[];
  doneIds: Set<number>;
}

interface RoutineStore {
  days: Record<string, DayData>; // dayLabel → blocks
  dates: Record<string, Set<number>>; // isoDate → doneIds
  loadDay: (dayLabel: string, modelId?: number) => void;
  loadDoneForDate: (isoDate: string) => void;
  toggleBlock: (isoDate: string, blockId: number) => void;
  isDone: (isoDate: string, blockId: number) => boolean;
}

export const useRoutineStore = create<RoutineStore>((set, get) => ({
  days: {},
  dates: {},

  loadDay(dayLabel, modelId) {
    // Always refetch so edits made in the "Gerenciar" screens show up here.
    const blocks = getBlocksForDay(dayLabel, modelId);
    set((s) => ({
      days: {
        ...s.days,
        [dayLabel]: { blocks, doneIds: s.days[dayLabel]?.doneIds ?? new Set() },
      },
    }));
  },

  loadDoneForDate(isoDate) {
    const doneIds = getDoneBlockIds(isoDate);
    set((s) => ({ dates: { ...s.dates, [isoDate]: doneIds } }));
  },

  toggleBlock(isoDate, blockId) {
    const current = get().isDone(isoDate, blockId);
    setBlockDone(isoDate, blockId, !current);
    // Update in-memory state
    set((s) => {
      const prev = s.dates[isoDate] ?? new Set<number>();
      const next = new Set(prev);
      if (!current) next.add(blockId);
      else next.delete(blockId);
      return { dates: { ...s.dates, [isoDate]: next } };
    });
  },

  isDone(isoDate, blockId) {
    return get().dates[isoDate]?.has(blockId) ?? false;
  },
}));
