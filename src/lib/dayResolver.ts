import { getDay } from 'date-fns';

// Holidays are no longer a day label — they're a rule applied by the engine
// (categories with skip_on_holiday are removed from the weekday routine).
export type DayLabel = 'Seg' | 'Ter' | 'Qua' | 'Qui' | 'Sex' | 'Sab' | 'Dom';

const JS_DAY_TO_LABEL: Record<number, DayLabel> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sab',
};

/** Pure: resolves a Date to its weekday label (holidays use the weekday routine). */
export function resolveDayLabel(date: Date): DayLabel {
  return JS_DAY_TO_LABEL[getDay(date)];
}

/** Whether a date is a holiday (lookup against the provided ISO set). */
export function isHolidayDate(date: Date, holidayDates: Set<string>): boolean {
  return holidayDates.has(toIsoDate(date));
}

/** Formats a Date to YYYY-MM-DD (local timezone). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns the ISO dates for Mon–Sun of the week containing `date`. */
export function getWeekDates(date: Date): Date[] {
  const day = getDay(date); // 0=Sun
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7)); // shift to Monday
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** Short weekday name used in UI headers. */
export function shortWeekdayPt(date: Date): string {
  const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return labels[getDay(date)];
}
