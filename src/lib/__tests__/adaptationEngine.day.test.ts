import { buildAdaptedDay, checkWindowInvariants } from '../adaptationEngine';
import type {
  AdaptedDayDeps,
  EngineBlock,
  EngineCategory,
  EngineEvent,
  EngineMonthly,
} from '../adaptationEngine';

const CATS: EngineCategory[] = [
  { id: 1, name: 'Trabalho', cutOrder: null, protected: 1, tieGroup: null, skipOnHoliday: 1 },
  { id: 2, name: 'Sono', cutOrder: 5, protected: 0, tieGroup: null },
  { id: 3, name: 'Rotina', cutOrder: 4, protected: 0, tieGroup: null },
  { id: 4, name: 'Alimentação', cutOrder: 3, protected: 0, tieGroup: null },
  { id: 5, name: 'Treino', cutOrder: 2, protected: 0, tieGroup: 'treino_estudo' },
  { id: 6, name: 'Estudo', cutOrder: 2, protected: 0, tieGroup: 'treino_estudo' },
  { id: 7, name: 'Lazer', cutOrder: 1, protected: 0, tieGroup: null },
];

function block(id: number, catId: number, start: string, end: string, dur: number): EngineBlock {
  const name = CATS.find((c) => c.id === catId)?.name ?? null;
  return { id, activity: name ?? `b${id}`, start, end, durationMin: dur, categoryId: catId, categoryName: name, sortOrder: id };
}

const DAY_SEG: EngineBlock[] = [
  block(1, 4, '06:00', '06:30', 30), // Café
  block(2, 6, '06:30', '08:30', 120), // Estudo
  block(3, 1, '08:30', '12:00', 210), // Trabalho (protected)
  block(4, 4, '12:00', '13:00', 60), // Almoço
  block(5, 7, '13:00', '14:30', 90), // Lazer
  block(6, 5, '14:30', '16:00', 90), // Treino
  block(7, 2, '22:00', '06:00', 480), // Sono
];

function deps(over: Partial<AdaptedDayDeps>): AdaptedDayDeps {
  return {
    date: '2026-06-08',
    dayLabel: 'Seg',
    blocks: DAY_SEG,
    categories: CATS,
    events: [],
    activeMonthly: [],
    ...over,
  };
}

const tItem = (d: ReturnType<typeof buildAdaptedDay>, key: string) =>
  d.timeline.find((i) => i.key === key);

describe('buildAdaptedDay', () => {
  it('1. normal day, no extras → OK, no cuts', () => {
    const d = buildAdaptedDay(deps({}));
    expect(d.mode).toBe('NORMAL');
    expect(d.verdict).toBe('OK');
    expect(d.demand).toBe(0);
    expect(d.cutsByLevel).toHaveLength(0);
    expect(d.timeline.some((i) => i.adapted || i.removed)).toBe(false);
  });

  it('2. holiday → MODE A: drops skip_on_holiday (Trabalho), no cuts, fits the event', () => {
    const event: EngineEvent = { id: 1, title: 'Almoço família', start: '13:00', end: '14:00', durationMin: 60, categoryName: null };
    // same weekday routine, but as a holiday: Trabalho (block 3) is removed by the rule
    const d = buildAdaptedDay(deps({ isHoliday: true, events: [event], holidayName: 'Natal' }));
    expect(d.mode).toBe('FERIADO');
    expect(d.verdict).toBe('FERIADO');
    expect(d.cutsByLevel).toHaveLength(0);
    expect(tItem(d, 'routine-3')).toBeUndefined(); // Trabalho dropped on the holiday
    expect(d.timeline.some((i) => i.adapted || i.removed)).toBe(false); // never cuts
    expect(tItem(d, 'event-1')).toMatchObject({ start: '13:00', end: '14:00' });
  });

  it('2b. holiday with no events keeps the window contiguous (free time absorbs)', () => {
    const d = buildAdaptedDay(deps({ isHoliday: true }));
    expect(tItem(d, 'routine-3')).toBeUndefined(); // Trabalho dropped
    expect(checkWindowInvariants(d.timeline)).toEqual([]); // no gaps; window full
  });

  it('3. 120-min event on a normal day → cuts Lazer first, then tied level', () => {
    const event: EngineEvent = { id: 1, title: 'Curso', start: '16:30', end: '18:30', durationMin: 120, categoryName: 'Estudo' };
    const d = buildAdaptedDay(deps({ events: [event] }));
    expect(d.verdict).toBe('AJUSTADO');
    expect(d.demand).toBe(120);
    expect(d.cutsByLevel[0]).toMatchObject({ cutOrder: 1, cut: 90 }); // Lazer fully
    expect(tItem(d, 'routine-5')).toMatchObject({ removed: true }); // Lazer removed
    expect(d.shortfall).toBe(0);
  });

  it('4. active monthly routine → counts into demand and is placed', () => {
    const monthly: EngineMonthly = { id: 9, name: 'Cortar o cabelo', durationMin: 60, suggestedBlock: 'Lazer', categoryName: 'Lazer' };
    const d = buildAdaptedDay(deps({ activeMonthly: [monthly] }));
    expect(d.demand).toBe(60);
    expect(d.verdict).toBe('AJUSTADO');
    expect(d.cutsByLevel[0]).toMatchObject({ cutOrder: 1, cut: 60 });
    expect(tItem(d, 'monthly-9')).toBeDefined();
  });

  it('5. event over Trabalho → CONFLITO, protected block untouched', () => {
    const event: EngineEvent = { id: 1, title: 'Médico', start: '09:00', end: '10:00', durationMin: 60, categoryName: null };
    const d = buildAdaptedDay(deps({ events: [event] }));
    expect(d.verdict).toBe('CONFLITO');
    expect(d.conflicts).toHaveLength(1);
    expect(d.conflicts[0].anchorKind).toBe('protected');
    expect(tItem(d, 'routine-3')).toMatchObject({ adaptedDuration: 210, adapted: false }); // Trabalho intact
    expect(tItem(d, 'event-1')?.conflict).toBe(true);
  });

  it('6. demand beyond all cuttable time → IMPOSSIVEL with shortfall', () => {
    const monthly: EngineMonthly = { id: 9, name: 'Mutirão', durationMin: 2000, suggestedBlock: null, categoryName: 'Rotina' };
    const d = buildAdaptedDay(deps({ activeMonthly: [monthly] }));
    expect(d.verdict).toBe('IMPOSSIVEL');
    expect(d.shortfall).toBeGreaterThan(0);
  });
});
