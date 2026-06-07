import { isHolidayPure, getHolidayNamePure } from '../holidays';

const HOLIDAYS_SET = new Set([
  '2026-01-01',
  '2026-02-16',
  '2026-02-17',
  '2026-04-03',
  '2026-12-25',
]);

const HOLIDAYS_MAP = new Map([
  ['2026-01-01', 'Confraternização Universal'],
  ['2026-12-25', 'Natal'],
  ['2026-04-03', 'Paixão de Cristo'],
]);

describe('isHolidayPure', () => {
  it('returns true for known holidays', () => {
    expect(isHolidayPure('2026-01-01', HOLIDAYS_SET)).toBe(true);
    expect(isHolidayPure('2026-12-25', HOLIDAYS_SET)).toBe(true);
    expect(isHolidayPure('2026-02-16', HOLIDAYS_SET)).toBe(true);
  });

  it('returns false for regular days', () => {
    expect(isHolidayPure('2026-06-01', HOLIDAYS_SET)).toBe(false);
    expect(isHolidayPure('2026-03-15', HOLIDAYS_SET)).toBe(false);
  });

  it('returns false for empty set', () => {
    expect(isHolidayPure('2026-12-25', new Set())).toBe(false);
  });
});

describe('getHolidayNamePure', () => {
  it('returns holiday name for known dates', () => {
    expect(getHolidayNamePure('2026-01-01', HOLIDAYS_MAP)).toBe('Confraternização Universal');
    expect(getHolidayNamePure('2026-12-25', HOLIDAYS_MAP)).toBe('Natal');
  });

  it('returns null for non-holiday dates', () => {
    expect(getHolidayNamePure('2026-06-01', HOLIDAYS_MAP)).toBeNull();
  });
});
