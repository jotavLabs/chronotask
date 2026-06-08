// Pure helpers to resolve which training day falls on a given date.

export type TrainingDayLite = { id: number; label: string; weekday: string };

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

/** Short weekday key for a date (real weekday, ignores holidays): 'Seg'…'Dom'. */
export function weekdayKey(date: Date): string {
  return WEEKDAYS[date.getDay()];
}

/** The training day scheduled for a weekday, or null (rest day). */
export function trainingForWeekday(
  weekday: string,
  days: TrainingDayLite[],
): TrainingDayLite | null {
  return days.find((d) => d.weekday === weekday) ?? null;
}

export function isTrainingDay(weekday: string, days: TrainingDayLite[]): boolean {
  return days.some((d) => d.weekday === weekday);
}

/** Training day for a date (null on rest days). */
export function trainingForDate(date: Date, days: TrainingDayLite[]): TrainingDayLite | null {
  return trainingForWeekday(weekdayKey(date), days);
}
