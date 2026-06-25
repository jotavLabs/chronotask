// Adapter: loads everything the (pure) adaptation engine needs from the DB and
// returns the Adapted Day. Keeps SQL/data access out of the engine and screens.

import { buildAdaptedDay } from '@/lib/adaptationEngine';
import type { AdaptedDay } from '@/lib/adaptationEngine';
import { isHolidayDate, resolveDayLabel, toIsoDate } from '@/lib/dayResolver';
import { getHolidayNamePure } from '@/lib/holidays';
import { getBlocksForDay } from './blocksRepo';
import { buildHolidayDateSet, buildHolidayMap, getAllCategories } from './categoriesRepo';
import { getModelIdForDate } from './schedulingRepo';
import { getEventsByDate } from './eventsRepo';
import { getAllMonthly } from './monthlyRoutinesRepo';

export function loadAdaptedDay(date: Date): AdaptedDay {
  const iso = toIsoDate(date);
  const holidaySet = buildHolidayDateSet();
  const dayLabel = resolveDayLabel(date);
  const isHoliday = isHolidayDate(date, holidaySet);
  const holidayName = isHoliday ? getHolidayNamePure(iso, buildHolidayMap()) : null;
  const modelId = getModelIdForDate(date);

  const blocks = getBlocksForDay(dayLabel, modelId).map((b) => ({
    id: b.id,
    activity: b.activity,
    start: b.start,
    end: b.end,
    durationMin: b.durationMin,
    categoryId: b.categoryId,
    categoryName: b.categoryName,
    sortOrder: b.sortOrder,
  }));

  const categories = getAllCategories().map((c) => ({
    id: c.id,
    name: c.name,
    cutOrder: c.cutOrder,
    protected: c.protected,
    tieGroup: c.tieGroup,
    skipOnHoliday: c.skipOnHoliday,
    fixedTime: c.fixedTime,
  }));

  const events = getEventsByDate(iso).map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    durationMin: e.durationMin,
    categoryName: e.categoryName,
  }));

  const activeMonthly = getAllMonthly()
    .filter((m) => m.scheduledDate === iso)
    .map((m) => ({
      id: m.id,
      name: m.name,
      durationMin: m.durationMin,
      suggestedBlock: m.suggestedBlock,
      categoryName: m.categoryName,
    }));

  return buildAdaptedDay({ date: iso, dayLabel, isHoliday, blocks, categories, events, activeMonthly, holidayName });
}

/**
 * Lightweight check (no engine run): which of the given ISO dates have extras
 * (an event or a scheduled monthly routine) — used by Semana to flag adjustments.
 */
export function getDatesWithExtras(isos: string[]): Set<string> {
  const set = new Set<string>();
  for (const iso of isos) {
    if (getEventsByDate(iso).length > 0) set.add(iso);
  }
  for (const m of getAllMonthly()) {
    if (m.scheduledDate && isos.includes(m.scheduledDate)) set.add(m.scheduledDate);
  }
  return set;
}
