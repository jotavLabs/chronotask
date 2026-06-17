// Pure time recompute for the routine after a drag-reorder. No DB / no UI.
//
// Given the day's blocks IN THE DESIRED ORDER, stacks their durations sequentially
// inside the day window [winStart, winEnd] (hard barriers, derived from Sono).
// Rigid blocks (incl. protected like Trabalho) keep their duration and flow in the
// chosen order; free-time blocks (Tempo Livre/Lazer/Leitura) are elastic and share
// the leftover so the day stays gapless. Sono is pinned to the window end.
//
// Mirrors the adaptation reflow's barriers + elastic-free model.

import { minutesToTime, timeToMinutes } from './validation';

/** Category names treated as elastic free time (must mirror the engine's set). */
export const FREE_CATEGORY_NAMES = ['Tempo Livre', 'Lazer', 'Leitura'];

export type RepackBlock = {
  id: number;
  durationMin: number;
  startMin: number; // current start (used to derive the window from Sono)
  free: boolean; // elastic free time
  sleep: boolean; // Sono — pinned to the window end
};

export type RepackPlacement = { id: number; start: string; end: string };

const DEFAULT_WIN_START = 360; // 06:00
const DEFAULT_WIN_END = 1320; // 22:00

/** Largest-remainder split of `total` across `weights` into whole minutes summing to total. */
function shareWhole(total: number, weights: number[]): number[] {
  const sumW = weights.reduce((s, w) => s + w, 0);
  if (sumW <= 0) {
    // equal split when there's no natural weight
    const base = Math.floor(total / weights.length);
    const out = weights.map(() => base);
    let rem = total - base * weights.length;
    for (let i = 0; rem > 0; i++, rem--) out[i % out.length] += 1;
    return out;
  }
  const exact = weights.map((w) => (total * w) / sumW);
  const floors = exact.map((x) => Math.floor(x));
  let deficit = total - floors.reduce((s, x) => s + x, 0);
  const order = weights.map((_, i) => i).sort((a, b) => exact[b] - floors[b] - (exact[a] - floors[a]));
  for (let k = 0; k < deficit; k++) floors[order[k]] += 1;
  return floors;
}

export function repackByOrder(
  ordered: RepackBlock[],
  fallbackStart = DEFAULT_WIN_START,
  fallbackEnd = DEFAULT_WIN_END,
): RepackPlacement[] {
  const sono = ordered.find((b) => b.sleep);
  const winStart = sono ? (sono.startMin + sono.durationMin) % 1440 : fallbackStart;
  const winEnd = sono ? sono.startMin : fallbackEnd;
  const windowLen = (winEnd - winStart + 1440) % 1440 || 1440;

  const queue = ordered.filter((b) => !b.sleep); // movable, in chosen order
  const rigidSum = queue.filter((b) => !b.free).reduce((s, b) => s + b.durationMin, 0);
  const frees = queue.filter((b) => b.free);

  // Free time shares whatever the rigids leave, so the window fills with no gaps.
  const freeBudget = Math.max(0, windowLen - rigidSum);
  const freeDur = new Map<number, number>();
  if (frees.length > 0) {
    const shares = shareWhole(freeBudget, frees.map((b) => Math.max(1, b.durationMin)));
    frees.forEach((b, i) => freeDur.set(b.id, shares[i]));
  }

  const placed = new Map<number, { start: number; end: number }>();
  let cursor = winStart;
  for (const b of queue) {
    const dur = b.free ? (freeDur.get(b.id) ?? 0) : b.durationMin;
    const end = Math.min(cursor + dur, winStart + windowLen); // never cross the barrier
    placed.set(b.id, { start: cursor, end });
    cursor = end;
  }

  const out: RepackPlacement[] = [];
  for (const b of ordered) {
    if (b.sleep) {
      out.push({ id: b.id, start: minutesToTime(winEnd % 1440), end: minutesToTime(winStart % 1440) });
    } else {
      const p = placed.get(b.id)!;
      out.push({ id: b.id, start: minutesToTime(p.start % 1440), end: minutesToTime(p.end % 1440) });
    }
  }
  return out;
}

/** Recomputed duration (minutes) implied by a placement, honoring midnight wrap. */
export function placementDuration(start: string, end: string): number {
  const s = timeToMinutes(start) ?? 0;
  const e = timeToMinutes(end) ?? 0;
  return ((e - s + 1440) % 1440) || 1440;
}
