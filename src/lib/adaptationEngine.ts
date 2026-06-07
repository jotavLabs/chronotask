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

import { minutesToTime, timeToMinutes } from './validation';

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

/** Block carrying both its original durationMin and the adapted value. */
export type AdaptedBlock = EngineBlock & { adaptedDuration: number };

export type CascadeResult = {
  adjusted: AdaptedBlock[];
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
  const adjustedBlocks: AdaptedBlock[] = blocks.map((b) => ({
    ...b,
    adaptedDuration: adjusted.get(b.id) ?? b.durationMin,
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

// ─── reflow ───────────────────────────────────────────────────────────────────

export type TimelineSource = 'routine' | 'event' | 'monthly';

export type TimelineItem = {
  key: string;
  start: string; // HH:MM (recomputed)
  end: string;
  activity: string;
  category: string | null;
  source: TimelineSource;
  adapted: boolean; // duration changed vs original
  originalDuration: number;
  adaptedDuration: number;
  removed: boolean; // cut to zero
  conflict?: boolean;
  note?: string;
};

type FloatItem = {
  key: string;
  activity: string;
  category: string | null;
  source: TimelineSource;
  originalDuration: number;
  duration: number;
  note?: string;
};

/**
 * Greedy, deterministic reflow (not optimal — small manual tweaks acceptable).
 * Works in a linear timeline [dayStart, dayStart+1440] so Sono (which crosses
 * midnight) is handled as the terminal block. Fixed anchors keep their clock
 * time; floating blocks (incl. active monthly routines) fill the gaps in order.
 */
export function reflow(
  adjusted: AdaptedBlock[],
  categories: EngineCategory[],
  events: EngineEvent[],
  activeMonthly: EngineMonthly[],
): TimelineItem[] {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const catOf = (b: AdaptedBlock) => (b.categoryId != null ? catById.get(b.categoryId) : undefined);
  const isProtected = (b: AdaptedBlock) => catOf(b)?.protected === 1;
  const isSleep = (b: AdaptedBlock) => catOf(b)?.name === 'Sono';

  const nonSleep = adjusted.filter((b) => !isSleep(b));
  const dayStart =
    nonSleep.length > 0 ? Math.min(...nonSleep.map((b) => timeToMinutes(b.start) ?? 0)) : 360;
  const toLinear = (min: number) => (min >= dayStart ? min : min + 1440);

  // floating routine blocks (duration > 0), in original order
  const floats: FloatItem[] = adjusted
    .filter((b) => !isProtected(b) && !isSleep(b) && b.adaptedDuration > 0)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((b) => ({
      key: `routine-${b.id}`,
      activity: b.activity,
      category: b.categoryName,
      source: 'routine' as const,
      originalDuration: b.durationMin,
      duration: b.adaptedDuration,
    }));

  // insert active monthly routines near suggestedBlock, else after last Lazer, else end
  for (const m of activeMonthly) {
    const mf: FloatItem = {
      key: `monthly-${m.id}`,
      activity: m.name,
      category: m.categoryName,
      source: 'monthly',
      originalDuration: m.durationMin,
      duration: m.durationMin,
      note: 'Rotina mensal',
    };
    let idx = -1;
    if (m.suggestedBlock) idx = floats.map((f) => f.category).lastIndexOf(m.suggestedBlock);
    if (idx === -1) idx = floats.map((f) => f.category).lastIndexOf('Lazer');
    if (idx === -1) floats.push(mf);
    else floats.splice(idx + 1, 0, mf);
  }

  // fixed anchors: protected blocks + events, in linear coords
  type Fixed = { startLin: number; endLin: number; item: TimelineItem };
  const fixed: Fixed[] = [];
  for (const b of adjusted.filter(isProtected)) {
    const startLin = toLinear(timeToMinutes(b.start) ?? 0);
    fixed.push({
      startLin,
      endLin: startLin + b.adaptedDuration,
      item: {
        key: `routine-${b.id}`,
        start: b.start,
        end: b.end,
        activity: b.activity,
        category: b.categoryName,
        source: 'routine',
        adapted: false,
        originalDuration: b.durationMin,
        adaptedDuration: b.adaptedDuration,
        removed: false,
      },
    });
  }
  for (const ev of events) {
    const startLin = toLinear(timeToMinutes(ev.start) ?? 0);
    fixed.push({
      startLin,
      endLin: startLin + ev.durationMin,
      item: {
        key: `event-${ev.id}`,
        start: ev.start,
        end: ev.end,
        activity: ev.title,
        category: ev.categoryName,
        source: 'event',
        adapted: false,
        originalDuration: ev.durationMin,
        adaptedDuration: ev.durationMin,
        removed: false,
      },
    });
  }
  fixed.sort((a, b) => a.startLin - b.startLin);

  const out: TimelineItem[] = [];
  let cursor = dayStart;
  let fi = 0;

  const placeFloat = (f: FloatItem, at: number) => {
    out.push({
      key: f.key,
      start: minutesToTime(at % 1440),
      end: minutesToTime((at + f.duration) % 1440),
      activity: f.activity,
      category: f.category,
      source: f.source,
      adapted: f.duration !== f.originalDuration,
      originalDuration: f.originalDuration,
      adaptedDuration: f.duration,
      removed: false,
      note: f.note,
    });
  };

  for (const anchor of fixed) {
    while (fi < floats.length && cursor + floats[fi].duration <= anchor.startLin) {
      placeFloat(floats[fi], cursor);
      cursor += floats[fi].duration;
      fi++;
    }
    out.push(anchor.item);
    cursor = Math.max(cursor, anchor.endLin);
  }

  // sleep is terminal: end fixed (original), starts later if shortened or pushed
  const sleep = adjusted.find(isSleep);
  while (fi < floats.length) {
    placeFloat(floats[fi], cursor);
    cursor += floats[fi].duration;
    fi++;
  }
  if (sleep) {
    const sleepEndLin = toLinear(timeToMinutes(sleep.start) ?? 1320) + sleep.durationMin;
    const start = Math.max(cursor, sleepEndLin - sleep.adaptedDuration);
    out.push({
      key: `routine-${sleep.id}`,
      start: minutesToTime(start % 1440),
      end: minutesToTime(sleepEndLin % 1440),
      activity: sleep.activity,
      category: sleep.categoryName,
      source: 'routine',
      adapted: sleep.adaptedDuration !== sleep.durationMin,
      originalDuration: sleep.durationMin,
      adaptedDuration: sleep.adaptedDuration,
      removed: false,
    });
  }

  // removed blocks (cut to zero) surfaced at the end
  const removed: TimelineItem[] = adjusted
    .filter((b) => !isProtected(b) && !isSleep(b) && b.adaptedDuration <= 0)
    .map((b) => ({
      key: `routine-${b.id}`,
      start: b.start,
      end: b.end,
      activity: b.activity,
      category: b.categoryName,
      source: 'routine' as const,
      adapted: true,
      originalDuration: b.durationMin,
      adaptedDuration: 0,
      removed: true,
    }));

  return [...out, ...removed];
}
