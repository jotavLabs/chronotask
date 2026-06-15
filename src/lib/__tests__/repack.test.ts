import { placementDuration, repackByOrder } from '../repack';
import type { RepackBlock } from '../repack';

const b = (id: number, durationMin: number, startMin: number, free = false, sleep = false): RepackBlock => ({
  id,
  durationMin,
  startMin,
  free,
  sleep,
});

// Sono 22:00 → 06:00 ⇒ window 06:00–22:00 (360–1320, 960 min)
const SONO = b(99, 480, 1320, false, true);
const toMin = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

/** Sorts placements by start (excluding Sono) and checks the window is gapless. */
function spine(res: { id: number; start: string; end: string }[]) {
  return res.filter((r) => r.id !== 99).sort((a, z) => toMin(a.start) - toMin(z.start));
}

describe('repackByOrder', () => {
  it('stacks rigids in the new order, contiguous, Sono pinned to the window end', () => {
    const res = repackByOrder([b(2, 240, 480), b(1, 120, 360), b(3, 600, 720, true), SONO]);
    const byId = Object.fromEntries(res.map((r) => [r.id, r]));
    expect(byId[2]).toMatchObject({ start: '06:00', end: '10:00' }); // B first: 360–600
    expect(byId[1]).toMatchObject({ start: '10:00', end: '12:00' }); // A: 600–720
    expect(byId[3]).toMatchObject({ start: '12:00', end: '22:00' }); // free fills to winEnd
    expect(byId[99]).toMatchObject({ start: '22:00', end: '06:00' }); // Sono pinned
  });

  it('keeps rigid durations and lets free time absorb the slack (no gaps)', () => {
    const res = repackByOrder([b(1, 60, 360), b(2, 60, 420), b(3, 100, 480, true), SONO]);
    const byId = Object.fromEntries(res.map((r) => [r.id, r]));
    expect(placementDuration(byId[1].start, byId[1].end)).toBe(60);
    expect(placementDuration(byId[2].start, byId[2].end)).toBe(60);
    expect(placementDuration(byId[3].start, byId[3].end)).toBe(840); // 960 − 120, stretched
  });

  it('splits leftover across multiple free blocks proportionally', () => {
    const res = repackByOrder([b(1, 360, 360), b(2, 100, 720, true), b(3, 300, 820, true), SONO]);
    const byId = Object.fromEntries(res.map((r) => [r.id, r]));
    // budget = 960 − 360 = 600, weights 100:300 → 150 / 450
    expect(placementDuration(byId[2].start, byId[2].end)).toBe(150);
    expect(placementDuration(byId[3].start, byId[3].end)).toBe(450);
  });

  it('produces a gapless window from winStart to winEnd', () => {
    const res = repackByOrder([b(1, 120, 360), b(2, 240, 480), b(3, 600, 720, true), SONO]);
    const s = spine(res);
    expect(toMin(s[0].start)).toBe(360);
    for (let i = 0; i < s.length - 1; i++) expect(s[i].end).toBe(s[i + 1].start);
    expect(toMin(s[s.length - 1].end)).toBe(1320);
  });

  it('pins Sono wherever it sits in the input order', () => {
    const res = repackByOrder([SONO, b(1, 480, 360), b(2, 480, 840, true)]);
    expect(res.find((r) => r.id === 99)).toMatchObject({ start: '22:00', end: '06:00' });
  });
});
