import {
  computeDuration,
  formatDuration,
  isValidDate,
  isValidTime,
  minutesToTime,
  parseTime,
  timeToMinutes,
  validateBlock,
  validateEvent,
  validateMonthly,
} from '../validation';

describe('parseTime / isValidTime', () => {
  it('parses valid times', () => {
    expect(parseTime('06:00')).toEqual({ h: 6, m: 0 });
    expect(parseTime('23:59')).toEqual({ h: 23, m: 59 });
    expect(parseTime('7:05')).toEqual({ h: 7, m: 5 });
  });

  it('rejects malformed or out-of-range times', () => {
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('12:60')).toBeNull();
    expect(parseTime('aa:bb')).toBeNull();
    expect(parseTime('1200')).toBeNull();
    expect(isValidTime('08:30')).toBe(true);
    expect(isValidTime('99:99')).toBe(false);
  });
});

describe('timeToMinutes / minutesToTime', () => {
  it('round-trips', () => {
    expect(timeToMinutes('06:30')).toBe(390);
    expect(minutesToTime(390)).toBe('06:30');
    expect(minutesToTime(0)).toBe('00:00');
  });
});

describe('computeDuration (midnight wrap)', () => {
  it('computes same-day durations', () => {
    expect(computeDuration('08:30', '12:00')).toBe(210);
    expect(computeDuration('06:00', '06:15')).toBe(15);
  });

  it('wraps across midnight when end <= start', () => {
    expect(computeDuration('22:00', '06:00')).toBe(480); // sleep
    expect(computeDuration('23:30', '00:30')).toBe(60);
    expect(computeDuration('08:00', '08:00')).toBe(1440); // full day
  });

  it('returns null on invalid input', () => {
    expect(computeDuration('25:00', '06:00')).toBeNull();
    expect(computeDuration('08:00', 'xx:yy')).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats minutes/hours', () => {
    expect(formatDuration(45)).toBe('45min');
    expect(formatDuration(90)).toBe('1h30');
    expect(formatDuration(480)).toBe('8h');
  });
});

describe('isValidDate', () => {
  it('accepts real dates and rejects impossible ones', () => {
    expect(isValidDate('2026-06-07')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false); // not a leap year
    expect(isValidDate('2024-02-29')).toBe(true); // leap year
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('2026-6-7')).toBe(false); // needs zero-padding
  });
});

describe('validateBlock', () => {
  const base = { start: '08:00', end: '09:00', activity: 'Estudo', categoryId: 1 };

  it('passes valid input', () => {
    expect(validateBlock(base).ok).toBe(true);
  });

  it('flags empty activity, missing category and bad times', () => {
    const r = validateBlock({ ...base, activity: '  ', categoryId: null, start: '99:99' });
    expect(r.ok).toBe(false);
    expect(r.errors.activity).toBeDefined();
    expect(r.errors.categoryId).toBeDefined();
    expect(r.errors.start).toBeDefined();
  });
});

describe('validateMonthly', () => {
  const base = {
    name: 'Cortar cabelo',
    windowStartDay: 11,
    windowEndDay: 17,
    durationMin: 60,
    categoryId: 2,
  };

  it('passes valid input', () => {
    expect(validateMonthly(base).ok).toBe(true);
  });

  it('rejects inverted window and bad days', () => {
    expect(validateMonthly({ ...base, windowStartDay: 20, windowEndDay: 10 }).ok).toBe(false);
    expect(validateMonthly({ ...base, windowStartDay: 0 }).ok).toBe(false);
    expect(validateMonthly({ ...base, windowEndDay: 32 }).ok).toBe(false);
    expect(validateMonthly({ ...base, durationMin: 0 }).ok).toBe(false);
  });
});

describe('validateEvent', () => {
  const base = {
    date: '2026-06-10',
    start: '14:00',
    end: '15:00',
    title: 'Dentista',
    categoryId: 3,
    priority: 'Média',
  };

  it('passes valid input', () => {
    expect(validateEvent(base).ok).toBe(true);
  });

  it('rejects empty title, bad date and missing category', () => {
    const r = validateEvent({ ...base, title: '', date: '2026-02-30', categoryId: null });
    expect(r.ok).toBe(false);
    expect(r.errors.title).toBeDefined();
    expect(r.errors.date).toBeDefined();
    expect(r.errors.categoryId).toBeDefined();
  });
});
