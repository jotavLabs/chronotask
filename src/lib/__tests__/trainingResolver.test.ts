import {
  isTrainingDay,
  trainingForDate,
  trainingForWeekday,
  weekdayKey,
} from '../trainingResolver';
import type { TrainingDayLite } from '../trainingResolver';

const DAYS: TrainingDayLite[] = [
  { id: 1, label: 'Upper A', weekday: 'Seg' },
  { id: 2, label: 'Lower A', weekday: 'Ter' },
  { id: 3, label: 'Upper B', weekday: 'Qui' },
  { id: 4, label: 'Lower B', weekday: 'Sex' },
];

describe('weekdayKey', () => {
  it('maps a date to its short weekday', () => {
    expect(weekdayKey(new Date(2026, 5, 8))).toBe('Seg'); // 2026-06-08 is Monday
    expect(weekdayKey(new Date(2026, 5, 10))).toBe('Qua');
    expect(weekdayKey(new Date(2026, 5, 14))).toBe('Dom');
  });
});

describe('trainingForWeekday / isTrainingDay', () => {
  it('returns the matching training day', () => {
    expect(trainingForWeekday('Seg', DAYS)?.label).toBe('Upper A');
    expect(trainingForWeekday('Sex', DAYS)?.label).toBe('Lower B');
  });

  it('returns null on rest days (Qua/Sab/Dom)', () => {
    expect(trainingForWeekday('Qua', DAYS)).toBeNull();
    expect(trainingForWeekday('Sab', DAYS)).toBeNull();
    expect(trainingForWeekday('Dom', DAYS)).toBeNull();
    expect(isTrainingDay('Qua', DAYS)).toBe(false);
    expect(isTrainingDay('Ter', DAYS)).toBe(true);
  });
});

describe('trainingForDate', () => {
  it('resolves training from a real date', () => {
    expect(trainingForDate(new Date(2026, 5, 8), DAYS)?.label).toBe('Upper A'); // Monday
    expect(trainingForDate(new Date(2026, 5, 11), DAYS)?.label).toBe('Upper B'); // Thursday
    expect(trainingForDate(new Date(2026, 5, 13), DAYS)).toBeNull(); // Saturday
  });
});
