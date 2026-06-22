import { findRedundantBlockIds } from '../cleanup';
import type { CleanupBlock } from '../cleanup';

const b = (id: number, start: string, end: string, sleep = false): CleanupBlock => ({ id, start, end, sleep });
// Sono 22:00→06:00 ⇒ window 06:00–22:00
const SONO = b(99, '22:00', '06:00', true);

describe('findRedundantBlockIds', () => {
  it('keeps a clean, non-overlapping day (gaps allowed)', () => {
    const day = [b(1, '06:00', '08:00'), b(2, '09:00', '12:00'), SONO]; // gap 08:00–09:00 is fine
    expect(findRedundantBlockIds(day)).toEqual([]);
  });

  it('removes a block that overlaps an already-kept one', () => {
    const day = [b(1, '06:00', '08:00'), b(2, '07:00', '09:00'), SONO];
    expect(findRedundantBlockIds(day)).toEqual([2]);
  });

  it('removes blocks outside the window (before wake / crossing into Sono)', () => {
    const day = [b(1, '05:00', '06:00'), b(2, '21:00', '23:00'), SONO];
    expect(findRedundantBlockIds(day).sort()).toEqual([1, 2]);
  });

  it('never removes Sono', () => {
    const day = [SONO];
    expect(findRedundantBlockIds(day)).toEqual([]);
  });

  it('collapses a doubled routine to a non-overlapping subset', () => {
    // two overlapping routines stacked in the same day
    const day = [
      b(1, '06:00', '07:00'),
      b(10, '06:00', '06:30'), // overlaps id 1
      b(2, '07:00', '08:00'),
      b(11, '07:30', '09:00'), // overlaps id 2 (kept ends 08:00; 07:30<08:00)
      SONO,
    ];
    expect(findRedundantBlockIds(day).sort((x, y) => x - y)).toEqual([10, 11]);
  });
});
