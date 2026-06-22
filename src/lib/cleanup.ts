// Pure detection of "leftover" blocks in a day: those that overlap an already-kept
// block or fall outside the day window (between Sono's end and Sono's start). Used by
// the Ajustes action that cleans up a model bloated by old/duplicated blocks. No DB/UI.

import { timeToMinutes } from './validation';

export type CleanupBlock = { id: number; start: string; end: string; sleep: boolean };

const DEFAULT_WIN_START = 360; // 06:00
const DEFAULT_WIN_END = 1320; // 22:00

/**
 * Returns the ids of blocks to remove so the day is non-overlapping and inside the
 * window. Keeps Sono; among the rest (sorted by start, then id) keeps each block that
 * starts at/after the running cursor and fits within [winStart, winEnd], dropping the
 * ones that overlap or cross the barriers. Gaps are allowed (not removed).
 */
export function findRedundantBlockIds(blocks: CleanupBlock[]): number[] {
  const sono = blocks.find((b) => b.sleep);
  const winStart = sono ? (timeToMinutes(sono.end) ?? DEFAULT_WIN_START) : DEFAULT_WIN_START;
  const winEnd = sono ? (timeToMinutes(sono.start) ?? DEFAULT_WIN_END) : DEFAULT_WIN_END;

  const movable = blocks
    .filter((b) => !b.sleep)
    .map((b) => ({ id: b.id, s: timeToMinutes(b.start) ?? 0, e: timeToMinutes(b.end) ?? 0 }))
    .sort((a, b) => a.s - b.s || a.id - b.id);

  const remove: number[] = [];
  let cursor = winStart;
  for (const b of movable) {
    const withinWindow = b.e > b.s && b.s >= winStart && b.e <= winEnd;
    if (withinWindow && b.s >= cursor) {
      cursor = b.e; // keep
    } else {
      remove.push(b.id);
    }
  }
  return remove;
}
