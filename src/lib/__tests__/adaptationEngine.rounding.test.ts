import { buildAdaptedDay, checkWindowInvariants } from '../adaptationEngine';
import type { AdaptedDayDeps, EngineBlock, EngineCategory, EngineEvent } from '../adaptationEngine';

const CATS: EngineCategory[] = [
  { id: 1, name: 'Trabalho', cutOrder: null, protected: 1, tieGroup: null },
  { id: 2, name: 'Sono', cutOrder: 5, protected: 0, tieGroup: null },
  { id: 3, name: 'Rotina', cutOrder: 4, protected: 0, tieGroup: null },
  { id: 4, name: 'Alimentação', cutOrder: 3, protected: 0, tieGroup: null },
  { id: 5, name: 'Treino', cutOrder: 2, protected: 0, tieGroup: 'treino_estudo' },
  { id: 6, name: 'Estudo', cutOrder: 2, protected: 0, tieGroup: 'treino_estudo' },
  { id: 7, name: 'Lazer', cutOrder: 1, protected: 0, tieGroup: null },
  { id: 8, name: 'Leitura', cutOrder: 1, protected: 0, tieGroup: null },
];

function eb(id: number, catId: number, start: string, end: string, dur: number): EngineBlock {
  const name = CATS.find((c) => c.id === catId)?.name ?? null;
  return { id, activity: name ?? `b${id}`, start, end, durationMin: dur, categoryId: catId, categoryName: name, sortOrder: id };
}

// Routine that, once an event cuts the free time unevenly, would otherwise leave
// blocks at broken times (Jantar 17:57, Higiene 19:59). Window 06:00–22:00 = 960.
const BASE: EngineBlock[] = [
  eb(1, 1, '06:00', '15:00', 540), // Trabalho
  eb(2, 7, '15:00', '15:30', 30), // Lazer (free)
  eb(3, 5, '15:30', '17:00', 90), // Treino
  eb(4, 6, '17:00', '19:00', 120), // Estudo
  eb(5, 4, '19:00', '19:45', 45), // Jantar
  eb(6, 3, '19:45', '20:15', 30), // Higiene
  eb(7, 8, '20:15', '22:00', 105), // Leitura (free)
  eb(8, 2, '22:00', '06:00', 480), // Sono
];

function deps(events: EngineEvent[]): AdaptedDayDeps {
  return { date: '2026-06-08', dayLabel: 'Seg', blocks: BASE, categories: CATS, events, activeMonthly: [] };
}

const toMins = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};
const allRounded = (tl: ReturnType<typeof buildAdaptedDay>['timeline']) =>
  tl.every((i) => i.removed || i.source === 'event' || (toMins(i.start) % 5 === 0 && toMins(i.end) % 5 === 0));

describe('reflow rounding to 5-minute marks', () => {
  it('event causing an uneven cut still yields only 5-min times', () => {
    const ev: EngineEvent = { id: 9, title: 'Compromisso', start: '15:00', end: '16:00', durationMin: 60, categoryName: null };
    const d = buildAdaptedDay(deps([ev]));
    expect(allRounded(d.timeline)).toBe(true);
    expect(checkWindowInvariants(d.timeline)).toEqual([]);
  });

  it('keeps intact rigid activities at their real duration (Jantar 45, Higiene 30)', () => {
    const ev: EngineEvent = { id: 9, title: 'Compromisso', start: '15:00', end: '16:00', durationMin: 60, categoryName: null };
    const d = buildAdaptedDay(deps([ev]));
    expect(d.timeline.find((i) => i.refId === 5 && !i.removed)?.adaptedDuration).toBe(45); // Jantar
    expect(d.timeline.find((i) => i.refId === 6 && !i.removed)?.adaptedDuration).toBe(30); // Higiene
  });

  it('base day (no event) stays rounded and gap-free', () => {
    const d = buildAdaptedDay(deps([]));
    expect(allRounded(d.timeline)).toBe(true);
    expect(checkWindowInvariants(d.timeline)).toEqual([]);
  });
});
