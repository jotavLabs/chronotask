// ─────────────────────────────────────────────────────────────────────────────
// Adaptation engine (Sprint 3) — pure, deterministic, no DB / no UI.
//
// Two opposite modes for a given date:
//   MODE A (holiday): uses the 'Feriado' template and only *fits* events/monthly
//                     into free time — nothing is shortened.
//   MODE B (normal):  extra demand (events + scheduled monthly routines) is taken
//                     from the routine by cut_order priority (cascade), then the
//                     timeline is reflowed around fixed anchors.
// ─────────────────────────────────────────────────────────────────────────────

import { timeToMinutes } from './validation';

export type EngineCategory = {
  id: number;
  name: string;
  cutOrder: number | null;
  protected: number; // 1 = never cut
  tieGroup: string | null;
};

export type EngineBlock = {
  id: number;
  activity: string;
  start: string; // HH:MM
  end: string; // HH:MM
  durationMin: number;
  categoryId: number | null;
  categoryName: string | null;
  sortOrder: number;
};

export type EngineEvent = {
  id: number;
  title: string;
  start: string;
  end: string;
  durationMin: number;
  categoryName: string | null;
};

export type EngineMonthly = {
  id: number;
  name: string;
  durationMin: number;
  suggestedBlock: string | null;
  categoryName: string | null;
};

/** Round to the nearest 5 minutes (practicality; may differ slightly from D). */
export function round5(n: number): number {
  return Math.round(n / 5) * 5;
}

/** Extra demand for the date: total minutes of events + scheduled monthly routines. */
export function computeDemand(events: EngineEvent[], activeMonthly: EngineMonthly[]): number {
  const e = events.reduce((sum, x) => sum + x.durationMin, 0);
  const m = activeMonthly.reduce((sum, x) => sum + x.durationMin, 0);
  return e + m;
}

export type CascadeLevel = {
  cutOrder: number;
  categories: string[];
  avail: number; // total original minutes in the level
  cut: number; // minutes removed from the level
  fracPct: number; // % cut, for display
};

export type CascadeResult = {
  adjusted: EngineBlock[]; // same blocks, durationMin replaced by adapted value
  cutsByLevel: CascadeLevel[];
  shortfall: number; // minutes that could not be freed (even cutting Sleep)
};

/**
 * Cascade sacrifice: removes `demand` minutes from cuttable blocks by ascending
 * cut_order. Within a level, every block is cut by the same fraction
 * (proportional), so ties (e.g. Treino+Estudo) shrink evenly. Protected
 * categories and blocks without a cut_order are never touched.
 */
export function runCascade(
  blocks: EngineBlock[],
  categories: EngineCategory[],
  demand: number,
): CascadeResult {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const catOf = (b: EngineBlock) => (b.categoryId != null ? catById.get(b.categoryId) : undefined);
  const isProtected = (b: EngineBlock) => catOf(b)?.protected === 1;
  const cutOrderOf = (b: EngineBlock) => catOf(b)?.cutOrder ?? null;

  const adjusted = new Map<number, number>();
  for (const b of blocks) adjusted.set(b.id, b.durationMin);

  const cuttable = blocks.filter((b) => !isProtected(b) && cutOrderOf(b) != null);
  const orders = Array.from(new Set(cuttable.map((b) => cutOrderOf(b) as number))).sort(
    (a, b) => a - b,
  );

  let remaining = demand;
  const cutsByLevel: CascadeLevel[] = [];

  for (const order of orders) {
    if (remaining <= 0) break;
    const levelBlocks = cuttable.filter((b) => cutOrderOf(b) === order);
    const avail = levelBlocks.reduce((sum, b) => sum + b.durationMin, 0);
    if (avail <= 0) continue;

    const cut = Math.min(remaining, avail);
    const frac = cut / avail;
    for (const b of levelBlocks) {
      adjusted.set(b.id, round5(b.durationMin * (1 - frac)));
    }

    cutsByLevel.push({
      cutOrder: order,
      categories: Array.from(new Set(levelBlocks.map((b) => b.categoryName ?? '—'))),
      avail,
      cut,
      fracPct: Math.round(frac * 100),
    });
    remaining -= cut;
  }

  const shortfall = Math.max(0, remaining);
  const adjustedBlocks = blocks.map((b) => ({
    ...b,
    durationMin: adjusted.get(b.id) ?? b.durationMin,
  }));
  return { adjusted: adjustedBlocks, cutsByLevel, shortfall };
}

// ─── anchors & conflicts ──────────────────────────────────────────────────────

export type AnchorKind = 'protected' | 'sleep' | 'event';

export type Anchor = {
  activity: string;
  start: string;
  end: string;
  startMin: number;
  endMin: number;
  wrap: boolean; // crosses midnight
  kind: AnchorKind;
};

function makeAnchor(activity: string, start: string, end: string, kind: AnchorKind): Anchor {
  const startMin = timeToMinutes(start) ?? 0;
  const endMin = timeToMinutes(end) ?? 0;
  return { activity, start, end, startMin, endMin, wrap: endMin <= startMin, kind };
}

/** Splits a possibly-wrapping interval into 1–2 same-day segments within [0,1440). */
function toSegments(startMin: number, endMin: number): Array<[number, number]> {
  if (endMin > startMin) return [[startMin, endMin]];
  return [
    [startMin, 1440],
    [0, endMin],
  ];
}

/** Overlap test that tolerates midnight wrap on either interval. */
export function intervalsOverlap(aS: number, aE: number, bS: number, bE: number): boolean {
  for (const [as, ae] of toSegments(aS, aE)) {
    for (const [bs, be] of toSegments(bS, bE)) {
      if (as < be && bs < ae) return true;
    }
  }
  return false;
}

/**
 * Fixed anchors for the day: protected blocks (Trabalho), the Sono block, and
 * every event (which has a set time). Floating blocks reflow around these.
 */
export function collectAnchors(
  blocks: EngineBlock[],
  categories: EngineCategory[],
  events: EngineEvent[],
): Anchor[] {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const anchors: Anchor[] = [];
  for (const b of blocks) {
    const cat = b.categoryId != null ? catById.get(b.categoryId) : undefined;
    const isProtected = cat?.protected === 1;
    const isSleep = cat?.name === 'Sono';
    if (isProtected) anchors.push(makeAnchor(b.activity, b.start, b.end, 'protected'));
    else if (isSleep) anchors.push(makeAnchor(b.activity, b.start, b.end, 'sleep'));
  }
  for (const ev of events) anchors.push(makeAnchor(ev.title, ev.start, ev.end, 'event'));
  return anchors;
}

export type Conflict = {
  event: EngineEvent;
  anchorActivity: string;
  anchorKind: AnchorKind;
};

/**
 * A conflict is an event overlapping a fixed protected/sleep anchor — something
 * the reflow cannot solve (the engine never cuts protected blocks). Returned to
 * the UI so the user can reschedule or adjust manually.
 */
export function detectConflicts(events: EngineEvent[], anchors: Anchor[]): Conflict[] {
  const fixed = anchors.filter((a) => a.kind === 'protected' || a.kind === 'sleep');
  const conflicts: Conflict[] = [];
  for (const ev of events) {
    const eS = timeToMinutes(ev.start);
    const eE = timeToMinutes(ev.end);
    if (eS == null || eE == null) continue;
    for (const a of fixed) {
      if (intervalsOverlap(eS, eE, a.startMin, a.endMin)) {
        conflicts.push({ event: ev, anchorActivity: a.activity, anchorKind: a.kind });
      }
    }
  }
  return conflicts;
}
