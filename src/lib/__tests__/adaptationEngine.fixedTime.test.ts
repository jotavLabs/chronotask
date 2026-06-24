import { buildAdaptedDay, checkWindowInvariants } from '../adaptationEngine';
import type { EngineBlock, EngineCategory } from '../adaptationEngine';

// O flag "horário fixo" só faz diferença DENTRO de uma janela (dia com bloco de Sono).
// Sem janela, todo bloco já fica no seu horário (ver adaptationEngine.freeplacement.test).
const CATS: EngineCategory[] = [
  { id: 1, name: 'Sono', cutOrder: 5, protected: 0, tieGroup: null },
  { id: 2, name: 'Rotina', cutOrder: 4, protected: 0, tieGroup: null, fixedTime: 1 },
  { id: 3, name: 'Tempo Livre', cutOrder: 1, protected: 0, tieGroup: null },
];

function eb(id: number, catId: number, start: string, end: string, dur: number): EngineBlock {
  const name = CATS.find((c) => c.id === catId)?.name ?? null;
  return { id, activity: name ?? `b${id}`, start, end, durationMin: dur, categoryId: catId, categoryName: name, sortOrder: id };
}

const sono = () => eb(10, 1, '22:00', '06:00', 480); // define a janela 06:00–22:00

const deps = (blocks: EngineBlock[], categories: EngineCategory[]) => ({
  date: '2026-06-24',
  dayLabel: 'Qua' as const,
  blocks,
  categories,
  events: [],
  activeMonthly: [],
});

describe('horário fixo (fixedTime) — dentro de uma janela', () => {
  it('bloco de horário fixo ancora no horário marcado', () => {
    const day = buildAdaptedDay(deps([sono(), eb(2, 2, '17:00', '17:45', 45)], CATS));
    expect(day.timeline.find((i) => i.key === 'routine-2')).toMatchObject({ start: '17:00', end: '17:45', removed: false });
    expect(checkWindowInvariants(day.timeline)).toEqual([]);
  });

  it('sem o flag, o mesmo bloco flui para o início da janela (06:00)', () => {
    const cats = CATS.map((c) => (c.id === 2 ? { ...c, fixedTime: 0 } : c));
    const day = buildAdaptedDay(deps([sono(), eb(2, 2, '17:00', '17:45', 45)], cats));
    expect(day.timeline.find((i) => i.key === 'routine-2')).toMatchObject({ start: '06:00', end: '06:45' });
  });
});
