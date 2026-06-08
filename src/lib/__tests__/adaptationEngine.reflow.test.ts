import { buildAdaptedDay, checkWindowInvariants, reflow } from '../adaptationEngine';
import type {
  AdaptedBlock,
  AdaptedDayDeps,
  EngineBlock,
  EngineCategory,
  EngineEvent,
} from '../adaptationEngine';

const CATS: EngineCategory[] = [
  { id: 1, name: 'Trabalho', cutOrder: null, protected: 1, tieGroup: null },
  { id: 2, name: 'Sono', cutOrder: 5, protected: 0, tieGroup: null },
  { id: 3, name: 'Rotina', cutOrder: 4, protected: 0, tieGroup: null },
  { id: 4, name: 'Alimentação', cutOrder: 3, protected: 0, tieGroup: null },
  { id: 5, name: 'Treino', cutOrder: 2, protected: 0, tieGroup: 'treino_estudo' },
  { id: 6, name: 'Estudo', cutOrder: 2, protected: 0, tieGroup: 'treino_estudo' },
  { id: 7, name: 'Lazer', cutOrder: 1, protected: 0, tieGroup: null },
];

function ab(
  id: number,
  catId: number,
  start: string,
  end: string,
  dur: number,
  adapted = dur,
): AdaptedBlock {
  const name = CATS.find((c) => c.id === catId)?.name ?? null;
  return { id, activity: name ?? `b${id}`, start, end, durationMin: dur, adaptedDuration: adapted, categoryId: catId, categoryName: name, sortOrder: id };
}

function eb(id: number, catId: number, start: string, end: string, dur: number): EngineBlock {
  const name = CATS.find((c) => c.id === catId)?.name ?? null;
  return { id, activity: name ?? `b${id}`, start, end, durationMin: dur, categoryId: catId, categoryName: name, sortOrder: id };
}

const find = (tl: ReturnType<typeof reflow>, key: string) => tl.find((i) => i.key === key);

// Base routine: Trabalho fills the morning, Lazer 17:30–18:30, Jantar, Estudo, Sono.
// Window 06:00–22:00 = 960 min (690 + 60 + 60 + 150).
const BASE_ADJ: AdaptedBlock[] = [
  ab(1, 1, '06:00', '17:30', 690), // Trabalho (protected)
  ab(2, 7, '17:30', '18:30', 60), // Lazer (free)
  ab(3, 4, '18:30', '19:30', 60), // Jantar
  ab(4, 6, '19:30', '22:00', 150), // Estudo
  ab(5, 2, '22:00', '06:00', 480), // Sono
];

function withLazer(adapted: number): AdaptedBlock[] {
  return BASE_ADJ.map((b) => (b.id === 2 ? { ...b, adaptedDuration: adapted } : b));
}

const event = (start: string, end: string, dur: number): EngineEvent => ({
  id: 9, title: 'Compromisso', start, end, durationMin: dur, categoryName: null,
});

describe('reflow — free time absorbs the event (cases 1–3)', () => {
  it('1. event starts with the free block → free time moves after it', () => {
    const tl = reflow(withLazer(30), CATS, [event('17:30', '18:00', 30)], []);
    expect(find(tl, 'routine-2')).toMatchObject({ start: '18:00', end: '18:30' });
    expect(find(tl, 'event-9')).toMatchObject({ start: '17:30', end: '18:00' });
    expect(find(tl, 'routine-3')).toMatchObject({ start: '18:30', end: '19:30' }); // Jantar unmoved
    expect(find(tl, 'routine-5')).toMatchObject({ start: '22:00', end: '06:00' }); // Sono fixed
    expect(checkWindowInvariants(tl)).toEqual([]);
  });

  it('2. event ends with the free block → free time stays before it', () => {
    const tl = reflow(withLazer(30), CATS, [event('18:00', '18:30', 30)], []);
    expect(find(tl, 'routine-2')).toMatchObject({ start: '17:30', end: '18:00' });
    expect(find(tl, 'event-9')).toMatchObject({ start: '18:00', end: '18:30' });
    expect(find(tl, 'routine-3')).toMatchObject({ start: '18:30', end: '19:30' });
    expect(checkWindowInvariants(tl)).toEqual([]);
  });

  it('3. event in the middle → free time splits around it', () => {
    const tl = reflow(withLazer(30), CATS, [event('17:45', '18:15', 30)], []);
    expect(find(tl, 'routine-2')).toMatchObject({ start: '17:30', end: '17:45' });
    expect(find(tl, 'routine-2#2')).toMatchObject({ start: '18:15', end: '18:30', refId: 2 });
    expect(find(tl, 'event-9')).toMatchObject({ start: '17:45', end: '18:15' });
    expect(find(tl, 'routine-5')).toMatchObject({ start: '22:00', end: '06:00' });
    expect(checkWindowInvariants(tl)).toEqual([]);
  });
});

// Pipeline helper (cascade + reflow) for cases that exercise the cascade.
function deps(over: Partial<AdaptedDayDeps>): AdaptedDayDeps {
  return { date: '2026-06-08', dayLabel: 'Seg', blocks: [], categories: CATS, events: [], activeMonthly: [], ...over };
}

describe('reflow — cascade integration with barriers (cases 4–7)', () => {
  it('4. 60-min event with only 30 of local free time → cascade frees the rest, nothing past 22:00', () => {
    const blocks = [
      eb(1, 1, '06:00', '17:00', 660), // Trabalho
      eb(2, 7, '17:00', '17:30', 30), // Lazer (only 30 free)
      eb(3, 5, '17:30', '19:00', 90), // Treino
      eb(4, 4, '19:00', '20:00', 60), // Jantar
      eb(5, 6, '20:00', '22:00', 120), // Estudo
      eb(6, 2, '22:00', '06:00', 480), // Sono
    ];
    const d = buildAdaptedDay(deps({ blocks, events: [event('17:00', '18:00', 60)] }));
    expect(d.verdict).toBe('AJUSTADO');
    expect(find(d.timeline, 'routine-2')).toMatchObject({ removed: true }); // local free consumed
    // 30 from free (Lazer→0), 30 from the cascade across the tied level 2 (Treino+Estudo)
    // exact distribution (largest-remainder): cuts 13 + 17 = 30, no round5
    expect(d.timeline.find((i) => i.refId === 3 && !i.removed)?.adaptedDuration).toBe(77); // Treino 90→77
    expect(d.timeline.find((i) => i.refId === 5 && !i.removed)?.adaptedDuration).toBe(103); // Estudo 120→103
    expect(checkWindowInvariants(d.timeline)).toEqual([]);
  });

  it('5. event over a low-priority activity → it yields the slot and is re-placed; Sono 22:00', () => {
    const blocks = [
      eb(1, 1, '06:00', '13:00', 420), // Trabalho
      eb(2, 5, '13:00', '15:00', 120), // Treino (low priority, under the event)
      eb(3, 7, '15:00', '16:00', 60), // Lazer
      eb(4, 4, '16:00', '17:00', 60), // Jantar
      eb(5, 6, '17:00', '22:00', 300), // Estudo
      eb(6, 2, '22:00', '06:00', 480), // Sono
    ];
    const d = buildAdaptedDay(deps({ blocks, events: [event('13:00', '13:30', 30)] }));
    expect(d.verdict).toBe('AJUSTADO');
    const treino = d.timeline.find((i) => i.refId === 2 && !i.removed);
    expect(treino?.start).toBe('13:30'); // Treino re-placed after the event
    expect(treino?.adaptedDuration).toBe(120); // not shortened (free paid)
    expect(checkWindowInvariants(d.timeline)).toEqual([]);
  });

  it('6. event over a high-priority activity → lower priority is cut, high one re-placed', () => {
    const blocks = [
      eb(1, 1, '06:00', '18:00', 720), // Trabalho
      eb(2, 4, '18:00', '19:00', 60), // Jantar (higher priority than Lazer/Estudo)
      eb(3, 7, '19:00', '20:00', 60), // Lazer
      eb(4, 6, '20:00', '22:00', 120), // Estudo
      eb(5, 2, '22:00', '06:00', 480), // Sono
    ];
    const d = buildAdaptedDay(deps({ blocks, events: [event('18:00', '18:30', 30)] }));
    const jantar = d.timeline.find((i) => i.refId === 2 && !i.removed);
    expect(jantar?.adaptedDuration).toBe(60); // Jantar not shortened
    expect(jantar?.start).toBe('18:30'); // re-placed after the event
    expect(d.cutsByLevel[0]?.cutOrder).toBe(1); // Lazer (lower priority) cut first
    expect(checkWindowInvariants(d.timeline)).toEqual([]);
  });

  it('7. event over Trabalho → conflict, protected block untouched', () => {
    const blocks = [
      eb(1, 1, '06:00', '18:00', 720), // Trabalho
      eb(2, 7, '18:00', '19:00', 60),
      eb(3, 4, '19:00', '20:00', 60),
      eb(4, 6, '20:00', '22:00', 120),
      eb(5, 2, '22:00', '06:00', 480),
    ];
    const d = buildAdaptedDay(deps({ blocks, events: [event('10:00', '11:00', 60)] }));
    expect(d.verdict).toBe('CONFLITO');
    expect(d.conflicts[0].anchorKind).toBe('protected');
    expect(d.timeline.find((i) => i.refId === 1)?.adaptedDuration).toBe(720); // Trabalho intact
  });
});

describe('reflow — base day and invariants', () => {
  it('no event → base routine unchanged, invariants hold', () => {
    const tl = reflow(BASE_ADJ, CATS, [], []);
    expect(find(tl, 'routine-2')).toMatchObject({ start: '17:30', end: '18:30' });
    expect(find(tl, 'routine-5')).toMatchObject({ start: '22:00', end: '06:00' });
    expect(checkWindowInvariants(tl)).toEqual([]);
  });
});
