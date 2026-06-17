import { periodStartIso, resolveModelForDate } from '../scheduling';
import type { SchedulingConfig } from '../scheduling';

// 2026-06-01 is a Monday; 06-08 and 06-15 are the following Mondays.
const items = [
  { position: 0, modelId: 1 },
  { position: 1, modelId: 2 },
];
const weekly: SchedulingConfig = {
  rotation: { enabled: true, mode: 'loop', period: 'weekly', anchorDate: '2026-06-01' },
  items,
  assignments: [],
};

describe('periodStartIso', () => {
  it('weekly → Monday; monthly → 1st', () => {
    expect(periodStartIso(new Date(2026, 5, 3), 'weekly')).toBe('2026-06-01'); // Wed → Mon
    expect(periodStartIso(new Date(2026, 5, 17), 'monthly')).toBe('2026-06-01');
  });
});

describe('resolveModelForDate', () => {
  it('none when there is no rotation or assignment', () => {
    const r = resolveModelForDate(new Date(2026, 5, 3), { rotation: null, items: [], assignments: [] });
    expect(r).toEqual({ modelId: null, source: 'none' });
  });

  it('loops A→B→A by week from the anchor', () => {
    expect(resolveModelForDate(new Date(2026, 5, 3), weekly)).toMatchObject({ modelId: 1, source: 'rotation' });
    expect(resolveModelForDate(new Date(2026, 5, 10), weekly)).toMatchObject({ modelId: 2, source: 'rotation' });
    expect(resolveModelForDate(new Date(2026, 5, 17), weekly)).toMatchObject({ modelId: 1, source: 'rotation' });
  });

  it('wraps for dates before the anchor', () => {
    expect(resolveModelForDate(new Date(2026, 4, 25), weekly)).toMatchObject({ modelId: 2 }); // one week before
  });

  it('an explicit assignment overrides the loop', () => {
    const cfg: SchedulingConfig = { ...weekly, assignments: [{ periodStart: '2026-06-08', modelId: 3 }] };
    expect(resolveModelForDate(new Date(2026, 5, 10), cfg)).toEqual({ modelId: 3, source: 'assignment' });
    // a different week still follows the loop
    expect(resolveModelForDate(new Date(2026, 5, 3), cfg)).toMatchObject({ modelId: 1, source: 'rotation' });
  });

  it('supports a monthly loop', () => {
    const monthly: SchedulingConfig = {
      rotation: { enabled: true, mode: 'loop', period: 'monthly', anchorDate: '2026-06-01' },
      items,
      assignments: [],
    };
    expect(resolveModelForDate(new Date(2026, 5, 20), monthly)).toMatchObject({ modelId: 1 }); // June
    expect(resolveModelForDate(new Date(2026, 6, 10), monthly)).toMatchObject({ modelId: 2 }); // July
    expect(resolveModelForDate(new Date(2026, 7, 10), monthly)).toMatchObject({ modelId: 1 }); // Aug
  });
});
