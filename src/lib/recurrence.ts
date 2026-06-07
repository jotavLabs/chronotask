import type { MonthlyRoutine } from '@/db/schema';

/**
 * Returns monthly routines that fall within their window for the given date.
 * Sprint 2 will add scheduling logic; here we just filter by window.
 */
export function getRoutinesForDate(
  date: Date,
  routines: MonthlyRoutine[],
): MonthlyRoutine[] {
  const dayOfMonth = date.getDate();
  return routines.filter(
    (r) => dayOfMonth >= r.windowStartDay && dayOfMonth <= r.windowEndDay,
  );
}
