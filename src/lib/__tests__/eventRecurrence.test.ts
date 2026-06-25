import { buildEventReminders } from '../notifications';
import { eventOccursOn, nextOccurrenceIso } from '../recurrence';

describe('eventOccursOn', () => {
  it('none: only the exact base date', () => {
    expect(eventOccursOn('2026-06-10', 'none', '2026-06-10')).toBe(true);
    expect(eventOccursOn('2026-06-10', 'none', '2026-06-11')).toBe(false);
  });

  it('never fires before the base date', () => {
    expect(eventOccursOn('2026-06-10', 'weekly', '2026-06-03')).toBe(false);
  });

  it('weekly: same weekday on/after base (+7 is always the same weekday)', () => {
    expect(eventOccursOn('2026-06-10', 'weekly', '2026-06-17')).toBe(true);
    expect(eventOccursOn('2026-06-10', 'weekly', '2026-06-18')).toBe(false);
  });

  it('monthly: same day-of-month', () => {
    expect(eventOccursOn('2026-06-10', 'monthly', '2026-07-10')).toBe(true);
    expect(eventOccursOn('2026-06-10', 'monthly', '2026-07-11')).toBe(false);
  });

  it('yearly: same month + day', () => {
    expect(eventOccursOn('2026-06-10', 'yearly', '2027-06-10')).toBe(true);
    expect(eventOccursOn('2026-06-10', 'yearly', '2027-07-10')).toBe(false);
  });
});

describe('nextOccurrenceIso', () => {
  it('none returns the base when not past, else null', () => {
    expect(nextOccurrenceIso('2026-06-10', 'none', '2026-06-01')).toBe('2026-06-10');
    expect(nextOccurrenceIso('2026-06-10', 'none', '2026-06-20')).toBeNull();
  });

  it('weekly returns the next matching weekday from `from`', () => {
    expect(nextOccurrenceIso('2026-06-10', 'weekly', '2026-06-12')).toBe('2026-06-17');
  });

  it('monthly rolls to next month when the day already passed', () => {
    expect(nextOccurrenceIso('2026-06-10', 'monthly', '2026-06-11')).toBe('2026-07-10');
  });
});

describe('buildEventReminders', () => {
  const date = new Date(2026, 5, 10);

  it('skips events with reminderMin < 0', () => {
    expect(buildEventReminders([{ title: 'X', start: '14:00', end: '15:00', reminderMin: -1 }], date)).toHaveLength(0);
  });

  it('schedules at start minus the lead time', () => {
    const [n] = buildEventReminders([{ title: 'Dentista', start: '14:00', end: '15:00', reminderMin: 10 }], date);
    expect(n.when.getHours()).toBe(13);
    expect(n.when.getMinutes()).toBe(50);
    expect(n.title).toBe('Dentista');
  });

  it('is not suppressed at dawn (events are exempt from the sleep rule)', () => {
    const [n] = buildEventReminders([{ title: 'Voo', start: '05:00', end: '07:00', reminderMin: 60 }], date);
    expect(n.when.getHours()).toBe(4);
  });
});
