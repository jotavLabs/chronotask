import { buildAdaptedDay, checkWindowInvariants } from '../adaptationEngine';
import type { EngineBlock, EngineCategory } from '../adaptationEngine';

const CATS: EngineCategory[] = [
  { id: 1, name: 'Rotina', cutOrder: 4, protected: 0, tieGroup: null, fixedTime: 1 },
  { id: 2, name: 'Tempo Livre', cutOrder: 1, protected: 0, tieGroup: null },
];

function eb(id: number, catId: number, start: string, end: string, dur: number): EngineBlock {
  const name = CATS.find((c) => c.id === catId)?.name ?? null;
  return { id, activity: name ?? `b${id}`, start, end, durationMin: dur, categoryId: catId, categoryName: name, sortOrder: id };
}

const deps = (blocks: EngineBlock[], categories: EngineCategory[]) => ({
  date: '2026-06-24',
  dayLabel: 'Qua' as const,
  blocks,
  categories,
  events: [],
  activeMonthly: [],
});

describe('horário fixo (fixedTime)', () => {
  it('bloco de horário fixo aparece no horário marcado (não flui pro 06:00)', () => {
    const day = buildAdaptedDay(deps([eb(1, 1, '17:00', '17:45', 45)], CATS));
    const item = day.timeline.find((i) => i.key === 'routine-1');
    expect(item).toMatchObject({ start: '17:00', end: '17:45', removed: false });
    // janela continua contígua (tempo livre preenche as folgas antes/depois)
    expect(checkWindowInvariants(day.timeline)).toEqual([]);
  });

  it('sem horário fixo, o mesmo bloco flui para o início do dia (06:00)', () => {
    const cats = CATS.map((c) => (c.id === 1 ? { ...c, fixedTime: 0 } : c));
    const day = buildAdaptedDay(deps([eb(1, 1, '17:00', '17:45', 45)], cats));
    const item = day.timeline.find((i) => i.key === 'routine-1');
    expect(item).toMatchObject({ start: '06:00', end: '06:45' });
  });

  it('mantém o horário fixo enquanto os blocos comuns fluem ao redor', () => {
    const day = buildAdaptedDay(
      deps([eb(1, 1, '17:00', '17:45', 45), eb(2, 2, '00:00', '00:00', 60)], CATS),
    );
    expect(day.timeline.find((i) => i.key === 'routine-1')).toMatchObject({ start: '17:00', end: '17:45' });
    expect(checkWindowInvariants(day.timeline)).toEqual([]);
  });
});
