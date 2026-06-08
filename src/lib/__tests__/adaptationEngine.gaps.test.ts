import { buildAdaptedDay, checkWindowInvariants } from '../adaptationEngine';
import type { AdaptedDayDeps, EngineBlock, EngineCategory, EngineEvent } from '../adaptationEngine';

const CATS: EngineCategory[] = [
  { id: 1, name: 'Trabalho', cutOrder: null, protected: 1, tieGroup: null },
  { id: 2, name: 'Sono', cutOrder: 5, protected: 0, tieGroup: null },
  { id: 4, name: 'Alimentação', cutOrder: 3, protected: 0, tieGroup: null },
  { id: 6, name: 'Estudo', cutOrder: 2, protected: 0, tieGroup: 'treino_estudo' },
  { id: 7, name: 'Lazer', cutOrder: 1, protected: 0, tieGroup: null },
  { id: 8, name: 'Leitura', cutOrder: 1, protected: 0, tieGroup: null },
];

function eb(id: number, catId: number, start: string, end: string, dur: number): EngineBlock {
  const name = CATS.find((c) => c.id === catId)?.name ?? null;
  return { id, activity: name ?? `b${id}`, start, end, durationMin: dur, categoryId: catId, categoryName: name, sortOrder: id };
}

// Window 06:00–22:00 = 960 (660 + 90 + 60 + 95 + 55). Lazer and Leitura are free.
const BASE: EngineBlock[] = [
  eb(1, 1, '06:00', '17:00', 660), // Trabalho
  eb(2, 7, '17:00', '18:30', 90), // Lazer (free)
  eb(3, 4, '18:30', '19:30', 60), // Jantar
  eb(4, 6, '19:30', '21:05', 95), // Estudo
  eb(5, 8, '21:05', '22:00', 55), // Leitura (free)
  eb(6, 2, '22:00', '06:00', 480), // Sono
];

function deps(events: EngineEvent[]): AdaptedDayDeps {
  return { date: '2026-06-08', dayLabel: 'Seg', blocks: BASE, categories: CATS, events, activeMonthly: [] };
}

const ev = (id: number, start: string, end: string, dur: number): EngineEvent => ({
  id, title: 'Compromisso', start, end, durationMin: dur, categoryName: null,
});

/** Window items must be contiguous and cover up to 22:00 (no sliver before Sono). */
function lastWindowEnd(d: ReturnType<typeof buildAdaptedDay>): string | undefined {
  const items = d.timeline.filter((i) => !i.removed && i.category !== 'Sono');
  return items.map((i) => i.end).sort().at(-1);
}

describe('reflow gap-closing', () => {
  it('bug: event 21:10–21:55 over Leitura → no empty gap before Sono', () => {
    const d = buildAdaptedDay(deps([ev(9, '21:10', '21:55', 45)]));
    expect(checkWindowInvariants(d.timeline)).toEqual([]);
    expect(lastWindowEnd(d)).toBe('22:00'); // something reaches 22:00, no sliver
    // the 21:55–22:00 slot is covered (free time), not empty
    const covers = d.timeline.some((i) => !i.removed && i.end === '22:00' && i.start <= '21:55');
    expect(covers).toBe(true);
  });

  it('broken clock times (17:23–18:07) → still contiguous and conserved', () => {
    const d = buildAdaptedDay(deps([ev(9, '17:23', '18:07', 44)]));
    expect(checkWindowInvariants(d.timeline)).toEqual([]);
    expect(d.timeline.find((i) => i.refId === 9)).toMatchObject({ start: '17:23', end: '18:07' });
  });

  it('multiple events same day → no leftover gaps, window conserved', () => {
    const d = buildAdaptedDay(deps([ev(9, '17:30', '18:00', 30), ev(10, '20:00', '20:45', 45)]));
    expect(checkWindowInvariants(d.timeline)).toEqual([]);
    expect(lastWindowEnd(d)).toBe('22:00');
  });

  it('no event → base day is already gap-free', () => {
    const d = buildAdaptedDay(deps([]));
    expect(checkWindowInvariants(d.timeline)).toEqual([]);
  });
});
