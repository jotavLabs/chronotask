import { resolveDayLabel, toIsoDate, getWeekDates } from '../dayResolver';

const NO_HOLIDAYS = new Set<string>();
const HOLIDAYS = new Set(['2026-12-25', '2026-01-01']);

describe('toIsoDate', () => {
  it('formats correctly', () => {
    expect(toIsoDate(new Date(2026, 5, 4))).toBe('2026-06-04'); // June 4
    expect(toIsoDate(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});

describe('resolveDayLabel', () => {
  it('returns correct weekday label', () => {
    expect(resolveDayLabel(new Date(2026, 5, 1), NO_HOLIDAYS)).toBe('Seg');  // Monday
    expect(resolveDayLabel(new Date(2026, 5, 2), NO_HOLIDAYS)).toBe('Ter');  // Tuesday
    expect(resolveDayLabel(new Date(2026, 5, 3), NO_HOLIDAYS)).toBe('Qua'); // Wednesday
    expect(resolveDayLabel(new Date(2026, 5, 4), NO_HOLIDAYS)).toBe('Qui'); // Thursday
    expect(resolveDayLabel(new Date(2026, 5, 5), NO_HOLIDAYS)).toBe('Sex'); // Friday
    expect(resolveDayLabel(new Date(2026, 5, 6), NO_HOLIDAYS)).toBe('Sab'); // Saturday
    expect(resolveDayLabel(new Date(2026, 5, 7), NO_HOLIDAYS)).toBe('Dom'); // Sunday
  });

  it('returns Feriado on holidays', () => {
    expect(resolveDayLabel(new Date(2026, 11, 25), HOLIDAYS)).toBe('Feriado'); // Dec 25
    expect(resolveDayLabel(new Date(2026, 0, 1), HOLIDAYS)).toBe('Feriado');   // Jan 1
  });

  it('holiday takes precedence over weekend', () => {
    // 2026-01-01 is a Thursday — make it a holiday to verify precedence
    const holidays = new Set(['2026-01-01']);
    expect(resolveDayLabel(new Date(2026, 0, 1), holidays)).toBe('Feriado');
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
