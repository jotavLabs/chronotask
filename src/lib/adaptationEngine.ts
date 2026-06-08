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

import type { DayLabel } from './dayResolver';
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
  refId: number; // id of the underlying block/event/monthly routine
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

/** Free-time category treated as a divisible buffer, split around fixed anchors. */
const SPLITTABLE_CATEGORY = 'Lazer';
const MIN_SPLIT = 15; // never create a fragment smaller than this (minutes)

type Float = {
  baseKey: string;
  refId: number;
  source: TimelineSource;
  activity: string;
  category: string | null;
  originalDuration: number;
  duration: number;
  origStart: number;
  splittable: boolean;
  fragment?: boolean;
  note?: string;
};

/**
 * Greedy, deterministic reflow (not optimal — small manual tweaks acceptable).
 * Works in a linear timeline [dayStart, dayStart+1440] so Sono (crossing
 * midnight) is the terminal block.
 *
 * Fixed anchors (protected blocks, events, Sono) keep their clock time and split
 * the day into free slots. Each floating block is assigned to the slot of its
 * ORIGINAL time, so morning blocks stay in the morning and evening blocks in the
 * evening — only what overlaps an anchor is pushed to the next slot, instead of
 * re-stacking the whole day from dawn (which previously cascaded into the night).
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

  // sleep terminal: end fixed (original), start anchored to it (later if shortened)
  const sleep = adjusted.find(isSleep);
  const sleepEndLin = sleep ? toLinear(timeToMinutes(sleep.start) ?? 1320) + sleep.durationMin : 0;
  const sleepAnchoredStart = sleep ? sleepEndLin - sleep.adaptedDuration : Number.POSITIVE_INFINITY;
  const dayLimit = sleep ? sleepAnchoredStart : dayStart + 1440;

  // fixed anchors (protected blocks + events)
  type Fixed = { startLin: number; endLin: number; item: TimelineItem };
  const fixed: Fixed[] = [];
  for (const b of adjusted.filter(isProtected)) {
    const startLin = toLinear(timeToMinutes(b.start) ?? 0);
    fixed.push({
      startLin,
      endLin: startLin + b.adaptedDuration,
      item: {
        key: `routine-${b.id}`, refId: b.id, start: b.start, end: b.end, activity: b.activity,
        category: b.categoryName, source: 'routine', adapted: false,
        originalDuration: b.durationMin, adaptedDuration: b.adaptedDuration, removed: false,
      },
    });
  }
  for (const ev of events) {
    const startLin = toLinear(timeToMinutes(ev.start) ?? 0);
    fixed.push({
      startLin,
      endLin: startLin + ev.durationMin,
      item: {
        key: `event-${ev.id}`, refId: ev.id, start: ev.start, end: ev.end, activity: ev.title,
        category: ev.categoryName, source: 'event', adapted: false,
        originalDuration: ev.durationMin, adaptedDuration: ev.durationMin, removed: false,
      },
    });
  }
  fixed.sort((a, b) => a.startLin - b.startLin);

  // free slots between anchors, within [dayStart, dayLimit]
  const slots: Array<{ start: number; end: number }> = [];
  let prev = dayStart;
  for (const a of fixed) {
    if (a.startLin > prev) slots.push({ start: prev, end: a.startLin });
    prev = Math.max(prev, a.endLin);
  }
  if (prev < dayLimit) slots.push({ start: prev, end: dayLimit });
  if (slots.length === 0) slots.push({ start: prev, end: prev + 1 });

  // floating blocks (duration > 0) with their original linear start
  const floats: Float[] = adjusted
    .filter((b) => !isProtected(b) && !isSleep(b) && b.adaptedDuration > 0)
    .map((b) => ({
      baseKey: `routine-${b.id}`, refId: b.id, source: 'routine' as const,
      activity: b.activity, category: b.categoryName,
      originalDuration: b.durationMin, duration: b.adaptedDuration,
      origStart: toLinear(timeToMinutes(b.start) ?? dayStart),
      splittable: b.categoryName === SPLITTABLE_CATEGORY,
    }));

  // active monthly routines: synthetic position near suggestedBlock (else afternoon)
  for (const m of activeMonthly) {
    const ref = m.suggestedBlock ? floats.find((f) => f.category === m.suggestedBlock) : undefined;
    floats.push({
      baseKey: `monthly-${m.id}`, refId: m.id, source: 'monthly',
      activity: m.name, category: m.categoryName,
      originalDuration: m.durationMin, duration: m.durationMin, note: 'Rotina mensal',
      origStart: ref ? ref.origStart + 1 : 13 * 60, splittable: false,
    });
  }
  floats.sort((a, b) => a.origStart - b.origStart);

  // assign each float to the slot containing its original time (or the next slot)
  const bySlot: Float[][] = slots.map(() => []);
  for (const f of floats) {
    let idx = slots.findIndex((s) => f.origStart >= s.start && f.origStart < s.end);
    if (idx === -1) idx = slots.findIndex((s) => s.start >= f.origStart);
    if (idx === -1) idx = slots.length - 1;
    bySlot[idx].push(f);
  }

  // emit anchors + floats (slot packing with split + overflow carry), then sort
  const emits: Array<{ startLin: number; item: TimelineItem }> = [];
  for (const a of fixed) emits.push({ startLin: a.startLin, item: a.item });

  // unique render keys (a split block shares its refId but needs distinct keys)
  const fragCount = new Map<string, number>();
  const keyFor = (baseKey: string) => {
    const n = (fragCount.get(baseKey) ?? 0) + 1;
    fragCount.set(baseKey, n);
    return n === 1 ? baseKey : `${baseKey}#${n}`;
  };

  const emit = (f: Float, at: number, pieceDur: number) => {
    const whole = pieceDur === f.duration && !f.fragment;
    emits.push({
      startLin: at,
      item: {
        key: keyFor(f.baseKey),
        refId: f.refId,
        start: minutesToTime(at % 1440),
        end: minutesToTime((at + pieceDur) % 1440),
        activity: f.activity,
        category: f.category,
        source: f.source,
        adapted: whole ? f.duration !== f.originalDuration : false,
        originalDuration: whole ? f.originalDuration : pieceDur,
        adaptedDuration: whole ? f.duration : pieceDur,
        removed: false,
        note: f.note,
      },
    });
  };

  let carry: Float[] = [];
  let tail = dayStart;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const queue = [...carry, ...bySlot[i]];
    carry = [];
    let cursor = slot.start;
    for (const f of queue) {
      const available = slot.end - cursor;
      if (available <= 0) {
        carry.push(f);
        continue;
      }
      if (f.duration <= available) {
        // fits whole: keep near its original time when there's room
        const desired = Math.max(cursor, Math.min(f.origStart, slot.end - f.duration));
        emit(f, desired, f.duration);
        cursor = desired + f.duration;
      } else if (f.splittable && available >= MIN_SPLIT) {
        // free-time buffer: place the part that fits, carry the rest past the anchor
        emit(f, cursor, available);
        carry.push({ ...f, duration: f.duration - available, origStart: slot.end, fragment: true });
        cursor = slot.end;
      } else {
        carry.push(f);
      }
    }
    tail = slot.end;
  }
  // leftovers that didn't fit any slot go after the last slot (may push sleep)
  let cursor = tail;
  for (const f of carry) {
    emit(f, cursor, f.duration);
    cursor += f.duration;
  }

  if (sleep) {
    const start = Math.max(sleepAnchoredStart, cursor);
    emits.push({
      startLin: start,
      item: {
        key: `routine-${sleep.id}`,
        refId: sleep.id,
        start: minutesToTime(start % 1440),
        end: minutesToTime(sleepEndLin % 1440),
        activity: sleep.activity,
        category: sleep.categoryName,
        source: 'routine',
        adapted: sleep.adaptedDuration !== sleep.durationMin,
        originalDuration: sleep.durationMin,
        adaptedDuration: sleep.adaptedDuration,
        removed: false,
      },
    });
  }

  emits.sort((a, b) => a.startLin - b.startLin);
  const out = emits.map((e) => e.item);

  // removed blocks (cut to zero) surfaced at the end
  const removed: TimelineItem[] = adjusted
    .filter((b) => !isProtected(b) && !isSleep(b) && b.adaptedDuration <= 0)
    .map((b) => ({
      key: `routine-${b.id}`, refId: b.id, start: b.start, end: b.end, activity: b.activity,
      category: b.categoryName, source: 'routine' as const, adapted: true,
      originalDuration: b.durationMin, adaptedDuration: 0, removed: true,
    }));

  return [...out, ...removed];
}

// ─── orchestration ────────────────────────────────────────────────────────────

export type AdaptedMode = 'FERIADO' | 'NORMAL';
export type Verdict = 'FERIADO' | 'OK' | 'AJUSTADO' | 'CONFLITO' | 'IMPOSSIVEL';

export type AdaptedDayDeps = {
  date: string; // ISO YYYY-MM-DD
  dayLabel: DayLabel;
  blocks: EngineBlock[];
  categories: EngineCategory[];
  events: EngineEvent[];
  activeMonthly: EngineMonthly[];
  holidayName?: string | null;
};

export type AdaptedDay = {
  date: string;
  mode: AdaptedMode;
  demand: number;
  timeline: TimelineItem[];
  cutsByLevel: CascadeLevel[];
  conflicts: Conflict[];
  shortfall: number;
  verdict: Verdict;
  holidayName: string | null;
};

function markConflicts(timeline: TimelineItem[], conflicts: Conflict[]): void {
  const keys = new Set(conflicts.map((c) => `event-${c.event.id}`));
  for (const item of timeline) if (keys.has(item.key)) item.conflict = true;
}

function noCut(blocks: EngineBlock[]): AdaptedBlock[] {
  return blocks.map((b) => ({ ...b, adaptedDuration: b.durationMin }));
}

/**
 * Builds the Adapted Day for a date, choosing MODE A (holiday: extend/fit) or
 * MODE B (normal: cascade sacrifice + reflow). Pure: all data comes via deps.
 */
export function buildAdaptedDay(deps: AdaptedDayDeps): AdaptedDay {
  const { date, dayLabel, blocks, categories, events, activeMonthly } = deps;
  const holidayName = deps.holidayName ?? null;
  const demand = computeDemand(events, activeMonthly);
  const anchors = collectAnchors(blocks, categories, events);
  const conflicts = detectConflicts(events, anchors);

  // MODE A — holiday: never cut, just fit events/monthly into free time.
  if (dayLabel === 'Feriado') {
    const timeline = reflow(noCut(blocks), categories, events, activeMonthly);
    markConflicts(timeline, conflicts);
    return {
      date,
      mode: 'FERIADO',
      demand,
      timeline,
      cutsByLevel: [],
      conflicts,
      shortfall: 0,
      verdict: 'FERIADO',
      holidayName,
    };
  }

  // MODE B — normal: no extra demand → base routine unchanged.
  if (demand === 0) {
    const timeline = reflow(noCut(blocks), categories, [], []);
    return {
      date,
      mode: 'NORMAL',
      demand: 0,
      timeline,
      cutsByLevel: [],
      conflicts,
      shortfall: 0,
      verdict: conflicts.length > 0 ? 'CONFLITO' : 'OK',
      holidayName,
    };
  }

  // MODE B — with demand: cascade sacrifice, then reflow.
  const { adjusted, cutsByLevel, shortfall } = runCascade(blocks, categories, demand);
  const timeline = reflow(adjusted, categories, events, activeMonthly);
  markConflicts(timeline, conflicts);
  const verdict: Verdict =
    shortfall > 0 ? 'IMPOSSIVEL' : conflicts.length > 0 ? 'CONFLITO' : 'AJUSTADO';

  return {
    date,
    mode: 'NORMAL',
    demand,
    timeline,
    cutsByLevel,
    conflicts,
    shortfall,
    verdict,
    holidayName,
  };
}
