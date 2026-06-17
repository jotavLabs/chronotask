import { isHolidayDate, resolveDayLabel, toIsoDate, getWeekDates } from '../dayResolver';

const HOLIDAYS = new Set(['2026-12-25', '2026-01-01']);

describe('toIsoDate', () => {
  it('formats correctly', () => {
    expect(toIsoDate(new Date(2026, 5, 4))).toBe('2026-06-04'); // June 4
    expect(toIsoDate(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});

describe('resolveDayLabel', () => {
  it('returns correct weekday label', () => {
    expect(resolveDayLabel(new Date(2026, 5, 1))).toBe('Seg'); // Monday
    expect(resolveDayLabel(new Date(2026, 5, 2))).toBe('Ter'); // Tuesday
    expect(resolveDayLabel(new Date(2026, 5, 3))).toBe('Qua'); // Wednesday
    expect(resolveDayLabel(new Date(2026, 5, 4))).toBe('Qui'); // Thursday
    expect(resolveDayLabel(new Date(2026, 5, 5))).toBe('Sex'); // Friday
    expect(resolveDayLabel(new Date(2026, 5, 6))).toBe('Sab'); // Saturday
    expect(resolveDayLabel(new Date(2026, 5, 7))).toBe('Dom'); // Sunday
  });

  it('holidays resolve to their weekday (no special label anymore)', () => {
    expect(resolveDayLabel(new Date(2026, 11, 25))).toBe('Sex'); // Dec 25 2026 is a Friday
    expect(resolveDayLabel(new Date(2026, 0, 1))).toBe('Qui'); // Jan 1 2026 is a Thursday
  });
});

describe('isHolidayDate', () => {
  it('detects holidays from the set', () => {
    expect(isHolidayDate(new Date(2026, 11, 25), HOLIDAYS)).toBe(true);
    expect(isHolidayDate(new Date(2026, 0, 1), HOLIDAYS)).toBe(true);
    expect(isHolidayDate(new Date(2026, 5, 1), HOLIDAYS)).toBe(false);
  });
});

describe('getWeekDates', () => {
  it('returns Mon–Sun for any day in the week', () => {
    const dates = getWeekDates(new Date(2026, 5, 3)); // Wednesday Jun 3 2026
    expect(dates).toHaveLength(7);
    expect(toIsoDate(dates[0])).toBe('2026-06-01'); // Monday
    expect(toIsoDate(dates[6])).toBe('2026-06-07'); // Sunday
  });

  it('works when given Monday', () => {
    const dates = getWeekDates(new Date(2026, 5, 1));
    expect(toIsoDate(dates[0])).toBe('2026-06-01');
  });

  it('works when given Sunday', () => {
    const dates = getWeekDates(new Date(2026, 5, 7));
    expect(toIsoDate(dates[0])).toBe('2026-06-01');
  });
});
