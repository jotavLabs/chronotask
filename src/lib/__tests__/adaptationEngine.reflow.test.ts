import { reflow } from '../adaptationEngine';
import type { AdaptedBlock, EngineCategory, EngineEvent, EngineMonthly } from '../adaptationEngine';

const CATS: EngineCategory[] = [
  { id: 1, name: 'Trabalho', cutOrder: null, protected: 1, tieGroup: null },
  { id: 2, name: 'Sono', cutOrder: 5, protected: 0, tieGroup: null },
  { id: 4, name: 'Alimentação', cutOrder: 3, protected: 0, tieGroup: null },
  { id: 6, name: 'Estudo', cutOrder: 2, protected: 0, tieGroup: null },
  { id: 7, name: 'Lazer', cutOrder: 1, protected: 0, tieGroup: null },
];

function ab(
  id: number,
  categoryId: number,
  start: string,
  end: string,
  durationMin: number,
  adaptedDuration = durationMin,
): AdaptedBlock {
  const name = CATS.find((c) => c.id === categoryId)?.name ?? null;
  return {
    id,
    activity: name ?? `b${id}`,
    start,
    end,
    durationMin,
    adaptedDuration,
    categoryId,
    categoryName: name,
    sortOrder: id,
  };
}

// Café 06:00, Estudo 06:30, Trabalho 08:30, Almoço 12:00, Lazer 13:00, Sono 22:00
const DAY: AdaptedBlock[] = [
  ab(1, 4, '06:00', '06:30', 30),
  ab(2, 6, '06:30', '08:30', 120),
  ab(3, 1, '08:30', '12:00', 210),
  ab(4, 4, '12:00', '13:00', 60),
  ab(5, 7, '13:00', '14:00', 60),
  ab(6, 2, '22:00', '06:00', 480),
];

function find(items: ReturnType<typeof reflow>, key: string) {
  return items.find((i) => i.key === key);
}

describe('reflow — base day (no extras)', () => {
  const tl = reflow(DAY, CATS, [], []);

  it('preserves original clock times when nothing is cut', () => {
    expect(find(tl, 'routine-1')).toMatchObject({ start: '06:00', end: '06:30' });
    expect(find(tl, 'routine-2')).toMatchObject({ start: '06:30', end: '08:30' });
    expect(find(tl, 'routine-3')).toMatchObject({ start: '08:30', end: '12:00' }); // Trabalho anchor
    expect(find(tl, 'routine-5')).toMatchObject({ start: '13:00', end: '14:00' });
    expect(find(tl, 'routine-6')).toMatchObject({ start: '22:00', end: '06:00' }); // Sono terminal
  });

  it('marks nothing as adapted/removed', () => {
    expect(tl.every((i) => !i.adapted && !i.removed)).toBe(true);
  });
});

describe('reflow — event anchor + removed block', () => {
  // Lazer cut to 0 (removed); event 14:00-16:00 fixed
  const adjusted = DAY.map((b) => (b.id === 5 ? { ...b, adaptedDuration: 0 } : b));
  const event: EngineEvent = {
    id: 9,
    title: 'Reunião',
    start: '14:00',
    end: '16:00',
    durationMin: 120,
    categoryName: 'Trabalho',
  };
  const tl = reflow(adjusted, CATS, [event], []);

  it('keeps the event at its fixed time', () => {
    expect(find(tl, 'event-9')).toMatchObject({ start: '14:00', end: '16:00', source: 'event' });
  });

  it('surfaces the zero-duration block as removed', () => {
    expect(find(tl, 'routine-5')).toMatchObject({ removed: true, adaptedDuration: 0 });
  });
});

describe('reflow — shortened sleep starts later', () => {
  const adjusted = DAY.map((b) => (b.id === 6 ? { ...b, adaptedDuration: 360 } : b));
  const tl = reflow(adjusted, CATS, [], []);

  it('anchors sleep end and pushes its start', () => {
    const sleep = find(tl, 'routine-6');
    expect(sleep).toMatchObject({ start: '00:00', end: '06:00', adapted: true });
  });
});

describe('reflow — monthly routine placement', () => {
  const monthly: EngineMonthly = {
    id: 3,
    name: 'Cortar o cabelo',
    durationMin: 60,
    suggestedBlock: 'Lazer',
    categoryName: 'Lazer',
  };
  const tl = reflow(DAY, CATS, [], [monthly]);

  it('inserts the monthly routine into the timeline', () => {
    const m = find(tl, 'monthly-3');
    expect(m).toBeDefined();
    expect(m).toMatchObject({ source: 'monthly', adaptedDuration: 60 });
  });
});
