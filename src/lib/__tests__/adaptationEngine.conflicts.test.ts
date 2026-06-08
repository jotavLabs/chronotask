import {
  collectAnchors,
  detectConflicts,
  intervalsOverlap,
} from '../adaptationEngine';
import type { EngineBlock, EngineCategory, EngineEvent } from '../adaptationEngine';

const CATS: EngineCategory[] = [
  { id: 1, name: 'Trabalho', cutOrder: null, protected: 1, tieGroup: null },
  { id: 2, name: 'Sono', cutOrder: 5, protected: 0, tieGroup: null },
  { id: 7, name: 'Lazer', cutOrder: 1, protected: 0, tieGroup: null },
];

const BLOCKS: EngineBlock[] = [
  { id: 1, activity: 'Trabalho', start: '08:30', end: '12:00', durationMin: 210, categoryId: 1, categoryName: 'Trabalho', sortOrder: 1 },
  { id: 2, activity: 'Lazer', start: '13:30', end: '14:15', durationMin: 45, categoryId: 7, categoryName: 'Lazer', sortOrder: 2 },
  { id: 3, activity: 'Sono', start: '22:00', end: '06:00', durationMin: 480, categoryId: 2, categoryName: 'Sono', sortOrder: 3 },
];

function ev(start: string, end: string): EngineEvent {
  return { id: 1, title: 'Compromisso', start, end, durationMin: 60, categoryName: null };
}

describe('intervalsOverlap (midnight wrap)', () => {
  it('detects same-day overlap', () => {
    expect(intervalsOverlap(540, 600, 510, 720)).toBe(true); // 09:00-10:00 vs 08:30-12:00
    expect(intervalsOverlap(840, 900, 510, 720)).toBe(false); // 14:00-15:00 vs 08:30-12:00
  });

  it('detects overlap against a wrapping interval (Sono 22:00-06:00)', () => {
    expect(intervalsOverlap(1380, 1410, 1320, 360)).toBe(true); // 23:00-23:30
    expect(intervalsOverlap(300, 330, 1320, 360)).toBe(true); // 05:00-05:30 (early morning)
    expect(intervalsOverlap(840, 900, 1320, 360)).toBe(false); // 14:00-15:00
  });
});

describe('collectAnchors', () => {
  it('marks protected, sleep and events as anchors', () => {
    const anchors = collectAnchors(BLOCKS, CATS, [ev('14:00', '15:00')]);
    const kinds = anchors.map((a) => a.kind).sort();
    expect(kinds).toEqual(['event', 'protected', 'sleep']);
    expect(anchors.find((a) => a.kind === 'sleep')?.wrap).toBe(true);
  });
});

describe('detectConflicts', () => {
  const anchors = collectAnchors(BLOCKS, CATS, []);

  it('flags an event over Trabalho', () => {
    const c = detectConflicts([ev('09:00', '10:00')], anchors);
    expect(c).toHaveLength(1);
    expect(c[0].anchorKind).toBe('protected');
  });

  it('flags an event over Sono (wrap)', () => {
    const c = detectConflicts([ev('23:00', '23:30')], anchors);
    expect(c).toHaveLength(1);
    expect(c[0].anchorKind).toBe('sleep');
  });

  it('no conflict for a free-time event', () => {
    expect(detectConflicts([ev('14:30', '15:30')], anchors)).toHaveLength(0);
  });
});
