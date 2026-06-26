import { create } from 'zustand';
import type { BlockWithCategory } from '@/repositories/blocksRepo';
import { getBlocksForDay } from '@/repositories/blocksRepo';
import { getDoneBlockIds, getStatusByBlock, setBlockDone, setBlockStatus } from '@/repositories/completionsRepo';
import { toIsoDate } from '@/lib/dayResolver';

interface DayData {
  blocks: BlockWithCategory[];
  doneIds: Set<number>;
}

interface RoutineStore {
  days: Record<string, DayData>; // dayLabel → blocks
  dates: Record<string, Set<number>>; // isoDate → done ids (=1)
  skipped: Record<string, Set<number>>; // isoDate → not-done ids (=2)
  loadDay: (dayLabel: string, modelId?: number) => void;
  loadDoneForDate: (isoDate: string) => void;
  loadStatusForDate: (isoDate: string) => void;
  toggleBlock: (isoDate: string, blockId: number) => void;
  cycleBlock: (isoDate: string, blockId: number) => void;
  isDone: (isoDate: string, blockId: number) => boolean;
  isSkipped: (isoDate: string, blockId: number) => boolean;
}

export const useRoutineStore = create<RoutineStore>((set, get) => ({
  days: {},
  dates: {},
  skipped: {},

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

  isSkipped(isoDate, blockId) {
    return get().skipped[isoDate]?.has(blockId) ?? false;
  },

  loadStatusForDate(isoDate) {
    const statuses = getStatusByBlock(isoDate);
    const done = new Set<number>();
    const skip = new Set<number>();
    for (const [id, st] of statuses) {
      if (st === 'done') done.add(id);
      else if (st === 'skip') skip.add(id);
    }
    set((s) => ({ dates: { ...s.dates, [isoDate]: done }, skipped: { ...s.skipped, [isoDate]: skip } }));
  },

  // Cycles a block: unmarked → done → not-done → unmarked.
  cycleBlock(isoDate, blockId) {
    const done = get().dates[isoDate]?.has(blockId) ?? false;
    const skip = get().skipped[isoDate]?.has(blockId) ?? false;
    const next = done ? 'skip' : skip ? 'none' : 'done';
    setBlockStatus(isoDate, blockId, next);
    set((s) => {
      const d = new Set(s.dates[isoDate] ?? []);
      const k = new Set(s.skipped[isoDate] ?? []);
      d.delete(blockId);
      k.delete(blockId);
      if (next === 'done') d.add(blockId);
      else if (next === 'skip') k.add(blockId);
      return { dates: { ...s.dates, [isoDate]: d }, skipped: { ...s.skipped, [isoDate]: k } };
    });
  },
}));
