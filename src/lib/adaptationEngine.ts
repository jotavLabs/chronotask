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
  const isSleep = (b: EngineBlock) => catOf(b)?.name === 'Sono';
  const cutOrderOf = (b: EngineBlock) => catOf(b)?.cutOrder ?? null;

  const adjusted = new Map<number, number>();
  for (const b of blocks) adjusted.set(b.id, b.durationMin);

  // Sono is immovable (outside the 06:00–22:00 window) → never cut to fit events
  const cuttable = blocks.filter((b) => !isProtected(b) && !isSleep(b) && cutOrderOf(b) != null);
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
    // Distribute the cut proportionally in WHOLE minutes whose sum is exactly
    // `cut` (largest-remainder), so no time is created or lost — never round5.
    const exact = levelBlocks.map((b) => (cut * b.durationMin) / avail);
    const floors = exact.map((x) => Math.floor(x));
    let deficit = cut - floors.reduce((s, x) => s + x, 0);
    const byRemainder = levelBlocks
      .map((_, i) => i)
      .sort((a, b) => exact[b] - floors[b] - (exact[a] - floors[a]));
    const cuts = floors.slice();
    for (let k = 0; k < deficit; k++) cuts[byRemainder[k]] += 1;
    levelBlocks.forEach((b, i) => adjusted.set(b.id, b.durationMin - cuts[i]));

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

/** Categories treated as elastic free-time buffers (shrink, split, reposition). */
const FREE_CATEGORIES = new Set(['Lazer', 'Leitura']);
const DAY_END = 1440;
const DEFAULT_WIN_START = 360; // 06:00
const DEFAULT_WIN_END = 1320; // 22:00

type QueueItem = {
  baseKey: string;
  refId: number;
  source: TimelineSource;
  activity: string;
  category: string | null;
  originalDuration: number;
  duration: number; // rigid: fixed; free: remaining (consumable)
  origStart: number;
  free: boolean;
  note?: string;
};

/**
 * Clock-based reflow with hard barriers and elastic free time.
 *
 * Invariants (guaranteed by construction; see checkWindowInvariants):
 *  - Activity window [winStart, winEnd] (from Sono; default 06:00–22:00). No
 *    activity block crosses 06:00 or 22:00.
 *  - Sono is immovable: exactly winEnd–06:00.
 *  - Time conservation: the window stays full — fitting a C-min event frees C
 *    minutes elsewhere (via the cascade), never stretching past 22:00.
 *
 * Fixed anchors (Trabalho, events) keep their clock time and split the window
 * into segments. Rigid activities are re-placed in order into the segments; free
 * time (Lazer/Leitura) is an elastic buffer that shrinks, splits and repositions
 * around the anchors instead of pushing the day forward.
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

  // window derived from the Sono block: [sonoEnd, sonoStart] (e.g. 06:00–22:00)
  const sleep = adjusted.find(isSleep);
  const winStart = sleep ? timeToMinutes(sleep.end) ?? DEFAULT_WIN_START : DEFAULT_WIN_START;
  const winEnd = sleep ? timeToMinutes(sleep.start) ?? DEFAULT_WIN_END : DEFAULT_WIN_END;
  const clampWin = (m: number) => Math.max(winStart, Math.min(winEnd, m));

  // fixed anchors (protected blocks + events), clamped to the window
  type Fixed = { start: number; end: number; item: TimelineItem };
  const fixed: Fixed[] = [];
  for (const b of adjusted.filter(isProtected)) {
    const s = clampWin(timeToMinutes(b.start) ?? winStart);
    fixed.push({
      start: s,
      end: clampWin(s + b.adaptedDuration),
      item: {
        key: `routine-${b.id}`, refId: b.id, start: b.start, end: b.end, activity: b.activity,
        category: b.categoryName, source: 'routine', adapted: false,
        originalDuration: b.durationMin, adaptedDuration: b.adaptedDuration, removed: false,
      },
    });
  }
  for (const ev of events) {
    const s = clampWin(timeToMinutes(ev.start) ?? winStart);
    fixed.push({
      start: s,
      end: clampWin(timeToMinutes(ev.end) ?? s + ev.durationMin),
      item: {
        key: `event-${ev.id}`, refId: ev.id, start: ev.start, end: ev.end, activity: ev.title,
        category: ev.categoryName, source: 'event', adapted: false,
        originalDuration: ev.durationMin, adaptedDuration: ev.durationMin, removed: false,
      },
    });
  }
  fixed.sort((a, b) => a.start - b.start);

  // free segments between anchors within the window
  const segments: Array<{ start: number; end: number }> = [];
  let prev = winStart;
  for (const a of fixed) {
    if (a.start > prev) segments.push({ start: prev, end: a.start });
    prev = Math.max(prev, a.end);
  }
  if (prev < winEnd) segments.push({ start: prev, end: winEnd });

  // queue of non-anchor blocks (rigid + free), in original order
  const queue: QueueItem[] = adjusted
    .filter((b) => !isProtected(b) && !isSleep(b) && b.adaptedDuration > 0)
    .map((b) => ({
      baseKey: `routine-${b.id}`, refId: b.id, source: 'routine' as const,
      activity: b.activity, category: b.categoryName,
      originalDuration: b.durationMin, duration: b.adaptedDuration,
      origStart: timeToMinutes(b.start) ?? winStart,
      free: b.categoryName != null && FREE_CATEGORIES.has(b.categoryName),
    }));

  // active monthly routines as rigid items near suggestedBlock (else afternoon)
  for (const m of activeMonthly) {
    const ref = m.suggestedBlock ? queue.find((q) => q.category === m.suggestedBlock) : undefined;
    queue.push({
      baseKey: `monthly-${m.id}`, refId: m.id, source: 'monthly',
      activity: m.name, category: m.categoryName,
      originalDuration: m.durationMin, duration: m.durationMin,
      origStart: ref ? ref.origStart + 1 : 13 * 60, free: false, note: 'Rotina mensal',
    });
  }
  queue.sort((a, b) => a.origStart - b.origStart);

  // emit helpers
  const emits: Array<{ start: number; item: TimelineItem }> = [];
  for (const a of fixed) emits.push({ start: a.start, item: a.item });

  const fragCount = new Map<string, number>();
  const keyFor = (baseKey: string) => {
    const n = (fragCount.get(baseKey) ?? 0) + 1;
    fragCount.set(baseKey, n);
    return n === 1 ? baseKey : `${baseKey}#${n}`;
  };
  const emit = (q: QueueItem, at: number, pieceDur: number) => {
    const whole = !q.free; // free time shows only the placed piece (no Δ)
    emits.push({
      start: at,
      item: {
        key: keyFor(q.baseKey), refId: q.refId,
        start: minutesToTime(at % DAY_END), end: minutesToTime((at + pieceDur) % DAY_END),
        activity: q.activity, category: q.category, source: q.source,
        adapted: whole ? q.duration !== q.originalDuration : false,
        originalDuration: whole ? q.originalDuration : pieceDur,
        adaptedDuration: whole ? q.duration : pieceDur,
        removed: false, note: q.note,
      },
    });
  };

  // pull free time from later in the queue to fill a gap a rigid can't cover
  const fillGap = (fromIdx: number, cursor: number, gap: number): number => {
    let c = cursor;
    let remaining = gap;
    for (let j = fromIdx; j < queue.length && remaining > 0; j++) {
      const q = queue[j];
      if (!q.free || q.duration <= 0) continue;
      const take = Math.min(q.duration, remaining);
      emit(q, c, take);
      c += take;
      q.duration -= take;
      remaining -= take;
    }
    return c;
  };

  // pack each segment from the ordered queue; free time is divisible/elastic
  let qi = 0;
  for (const seg of segments) {
    let cursor = seg.start;
    while (qi < queue.length && cursor < seg.end) {
      const q = queue[qi];
      if (q.duration <= 0) {
        qi++;
        continue;
      }
      const space = seg.end - cursor;
      if (q.free) {
        const take = Math.min(q.duration, space);
        emit(q, cursor, take);
        cursor += take;
        q.duration -= take;
        if (q.duration <= 0) qi++;
        else break; // segment full
      } else if (q.duration <= space) {
        emit(q, cursor, q.duration);
        cursor += q.duration;
        qi++;
      } else {
        // rigid doesn't fit: fill the leftover with free time pulled from ahead,
        // then move the rigid to the next segment
        cursor = fillGap(qi + 1, cursor, space);
        break;
      }
    }
  }

  // safety net: close any leftover gaps so the window is fully contiguous and
  // the last activity ends exactly at winEnd (touching Sono)
  emits.sort((a, b) => a.start - b.start);
  const windowItems = closeGaps(emits.map((e) => e.item), winStart, winEnd);

  // Sono: immovable, anchored to the window end (always winEnd–winStart)
  const out: TimelineItem[] = [...windowItems];
  if (sleep) {
    out.push({
      key: `routine-${sleep.id}`, refId: sleep.id, start: sleep.start, end: sleep.end,
      activity: sleep.activity, category: sleep.categoryName, source: 'routine',
      adapted: false, originalDuration: sleep.durationMin,
      adaptedDuration: sleep.durationMin, removed: false,
    });
  }

  // removed: cut to zero by the cascade, plus any overflow that didn't fit the
  // window (only happens on shortfall — never allowed to cross the barrier)
  const removed: TimelineItem[] = adjusted
    .filter((b) => !isProtected(b) && !isSleep(b) && b.adaptedDuration <= 0)
    .map((b) => ({
      key: `routine-${b.id}`, refId: b.id, start: b.start, end: b.end, activity: b.activity,
      category: b.categoryName, source: 'routine' as const, adapted: true,
      originalDuration: b.durationMin, adaptedDuration: 0, removed: true,
    }));
  for (; qi < queue.length; qi++) {
    const q = queue[qi];
    if (q.duration <= 0 || q.free) continue;
    removed.push({
      key: keyFor(q.baseKey), refId: q.refId, start: minutesToTime(q.origStart % DAY_END),
      end: minutesToTime((q.origStart + q.duration) % DAY_END), activity: q.activity,
      category: q.category, source: q.source, adapted: true,
      originalDuration: q.originalDuration, adaptedDuration: 0, removed: true,
    });
  }

  return [...out, ...removed];
}

/**
 * Final pass that removes any gaps inside the window so the timeline is fully
 * contiguous from winStart to winEnd. Anchors keep their time; a gap is closed by
 * extending the adjacent free-time block (preferred) or, if none, inserting a
 * "Tempo livre" filler. Guarantees the last activity ends exactly at winEnd.
 */
function closeGaps(items: TimelineItem[], winStart: number, winEnd: number): TimelineItem[] {
  const isFree = (it: TimelineItem) => it.category != null && FREE_CATEGORIES.has(it.category);
  const toMin = (s: string) => timeToMinutes(s) ?? 0;
  let fillerSeq = 0;
  const filler = (s: number, e: number): TimelineItem => ({
    key: `free-fill-${fillerSeq++}`, refId: -1,
    start: minutesToTime(s % DAY_END), end: minutesToTime(e % DAY_END),
    activity: 'Tempo livre', category: 'Lazer', source: 'routine',
    adapted: false, originalDuration: e - s, adaptedDuration: e - s, removed: false,
  });
  const grow = (it: TimelineItem, by: number): TimelineItem => ({
    ...it,
    end: minutesToTime((toMin(it.end) + by) % DAY_END),
    originalDuration: it.originalDuration + by,
    adaptedDuration: it.adaptedDuration + by,
  });

  const result: TimelineItem[] = [];
  let cursor = winStart;
  for (const it of items) {
    const s = toMin(it.start);
    const e = toMin(it.end);
    if (s > cursor) {
      const gap = s - cursor;
      const prev = result[result.length - 1];
      if (prev && isFree(prev)) {
        result[result.length - 1] = grow(prev, gap); // extend free time of origin
      } else if (isFree(it)) {
        result.push({
          ...it, start: minutesToTime(cursor % DAY_END),
          originalDuration: e - cursor, adaptedDuration: e - cursor,
        });
        cursor = e;
        continue;
      } else {
        result.push(filler(cursor, s)); // no flexible neighbour → insert filler
      }
    }
    result.push(it);
    cursor = Math.max(cursor, e);
  }
  // tail gap before winEnd (the sliver before Sono)
  if (cursor < winEnd) {
    const prev = result[result.length - 1];
    if (prev && isFree(prev)) result[result.length - 1] = grow(prev, winEnd - cursor);
    else result.push(filler(cursor, winEnd));
  }
  return result;
}

/**
 * Validates the window invariants on a timeline. Returns a list of violations
 * (empty when valid). Used by tests; cheap enough to call in dev if needed.
 */
export function checkWindowInvariants(
  timeline: TimelineItem[],
  winStart = DEFAULT_WIN_START,
  winEnd = DEFAULT_WIN_END,
): string[] {
  const errors: string[] = [];

  const sono = timeline.find((it) => it.category === 'Sono' && !it.removed);
  if (sono && timeToMinutes(sono.start) !== winEnd) {
    errors.push(`Sono não começa em ${minutesToTime(winEnd)} (${sono.start})`);
  }

  const windowItems = timeline
    .filter((it) => !it.removed && it.category !== 'Sono')
    .map((it) => ({ s: timeToMinutes(it.start) ?? 0, e: timeToMinutes(it.end) ?? 0, activity: it.activity }))
    .sort((a, b) => a.s - b.s);

  let sum = 0;
  let cursor = winStart;
  for (const it of windowItems) {
    if (it.s < winStart) errors.push(`${it.activity} começa antes de ${minutesToTime(winStart)}`);
    if (it.e > winEnd) errors.push(`${it.activity} termina depois de ${minutesToTime(winEnd)}`);
    if (it.s > cursor) errors.push(`Gap entre ${minutesToTime(cursor)} e ${minutesToTime(it.s)}`);
    sum += it.e - it.s;
    cursor = Math.max(cursor, it.e);
  }
  if (cursor < winEnd) errors.push(`Gap entre ${minutesToTime(cursor)} e ${minutesToTime(winEnd)} (antes do Sono)`);
  if (sum !== winEnd - winStart) errors.push(`Soma da janela = ${sum}, esperado ${winEnd - winStart}`);

  return errors;
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
