import type { MonthlyRoutine } from '@/db/schema';
import { toIsoDate } from './dayResolver';

export type MonthlyStatus =
  | 'HOJE'
  | 'FEITA'
  | 'AGENDADA'
  | 'AGENDAR'
  | 'ATRASADA'
  | 'AGUARDANDO';

/** UI label per status. Empty string for AGUARDANDO (nothing to show). */
export const MONTHLY_STATUS_LABEL: Record<MonthlyStatus, string> = {
  HOJE: 'HOJE',
  FEITA: 'feita este mês',
  AGENDADA: 'agendada',
  AGENDAR: 'agendar',
  ATRASADA: 'ATRASADA',
  AGUARDANDO: '',
};

/** Parses "YYYY-MM-DD" into a local Date (no timezone shift). Null if invalid. */
function parseIsoDate(iso: string | null): Date | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** True when the routine's last completion happened in `today`'s month. */
export function isDoneThisMonth(lastDone: string | null, today: Date): boolean {
  const d = parseIsoDate(lastDone);
  return d !== null && sameMonth(d, today);
}

/**
 * Pure status for a monthly routine relative to `today`. Priority order:
 * 1. scheduled for today                       → HOJE
 * 2. already done this month                   → FEITA
 * 3. scheduled for a future day this month     → AGENDADA
 * 4. today inside window, not done/scheduled   → AGENDAR
 * 5. window end passed, not done               → ATRASADA
 * 6. otherwise (before window)                 → AGUARDANDO
 */
export function getMonthlyStatus(routine: MonthlyRoutine, today: Date): MonthlyStatus {
  const todayIso = toIsoDate(today);
  const dayOfMonth = today.getDate();

  if (routine.scheduledDate === todayIso) return 'HOJE';
  if (isDoneThisMonth(routine.lastDone, today)) return 'FEITA';

  const scheduled = parseIsoDate(routine.scheduledDate);
  if (scheduled && sameMonth(scheduled, today) && scheduled > today) return 'AGENDADA';

  if (dayOfMonth >= routine.windowStartDay && dayOfMonth <= routine.windowEndDay) {
    return 'AGENDAR';
  }
  if (dayOfMonth > routine.windowEndDay) return 'ATRASADA';
  return 'AGUARDANDO';
}

/**
 * Monthly routines whose window currently contains `date`.
 * Kept from Sprint 1 for future use by the adaptation engine (S3).
 */
export function getRoutinesForDate(date: Date, routines: MonthlyRoutine[]): MonthlyRoutine[] {
  const dayOfMonth = date.getDate();
  return routines.filter(
    (r) => dayOfMonth >= r.windowStartDay && dayOfMonth <= r.windowEndDay,
  );
}

// ─── event recurrence (agenda) ──────────────────────────────────────────────────

export type EventRecurrence = 'none' | 'weekly' | 'monthly' | 'yearly';

export const RECURRENCE_LABEL: Record<EventRecurrence, string> = {
  none: 'Não repete',
  weekly: 'Toda semana',
  monthly: 'Todo mês',
  yearly: 'Todo ano',
};

/**
 * Whether an event anchored at `baseIso` (its first date) occurs on `targetIso`.
 * Recurrence never fires before the base. Monthly/yearly just require the same
 * day-of-month (and month, for yearly) — a base on day 31 simply skips short months.
 */
export function eventOccursOn(baseIso: string, recurrence: string, targetIso: string): boolean {
  if (recurrence === 'none' || !recurrence) return baseIso === targetIso;
  const base = parseIsoDate(baseIso);
  const target = parseIsoDate(targetIso);
  if (!base || !target || target < base) return false;
  switch (recurrence) {
    case 'weekly':
      return base.getDay() === target.getDay();
    case 'monthly':
      return base.getDate() === target.getDate();
    case 'yearly':
      return base.getDate() === target.getDate() && base.getMonth() === target.getMonth();
    default:
      return baseIso === targetIso;
  }
}

/** Next ISO date on/after `fromIso` when the event occurs, or null (~400-day horizon). */
export function nextOccurrenceIso(baseIso: string, recurrence: string, fromIso: string): string | null {
  if (recurrence === 'none' || !recurrence) return baseIso >= fromIso ? baseIso : null;
  const base = parseIsoDate(baseIso);
  const from = parseIsoDate(fromIso);
  if (!base || !from) return null;
  const cursor = base > from ? new Date(base) : new Date(from);
  for (let i = 0; i < 400; i++) {
    const iso = toIsoDate(cursor);
    if (eventOccursOn(baseIso, recurrence, iso)) return iso;
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}
