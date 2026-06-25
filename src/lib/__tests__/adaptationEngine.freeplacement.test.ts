import { buildAdaptedDay } from '../adaptationEngine';
import type { EngineBlock, EngineCategory } from '../adaptationEngine';

// Sem bloco de Sono não há janela: o dia é livre — cada bloco fica no seu horário,
// sem barreira 06:00–22:00 e sem preenchimento contíguo (lacunas são permitidas).
const CATS: EngineCategory[] = [
  { id: 1, name: 'Rotina', cutOrder: 4, protected: 0, tieGroup: null },
  { id: 2, name: 'Treino', cutOrder: 2, protected: 0, tieGroup: null },
];

function eb(id: number, catId: number, start: string, end: string, dur: number): EngineBlock {
  const name = CATS.find((c) => c.id === catId)?.name ?? null;
  return { id, activity: name ?? `b${id}`, start, end, durationMin: dur, categoryId: catId, categoryName: name, sortOrder: id };
}

const deps = (blocks: EngineBlock[]) => ({
  date: '2026-06-24',
  dayLabel: 'Qua' as const,
  blocks,
  categories: CATS,
  events: [],
  activeMonthly: [],
});

describe('posicionamento livre (sem janela / sem Sono)', () => {
  it('bloco fica no horário marcado, sem barreira nem preenchimento', () => {
    const day = buildAdaptedDay(deps([eb(1, 1, '17:00', '17:45', 45)]));
    expect(day.timeline.find((i) => i.key === 'routine-1')).toMatchObject({ start: '17:00', end: '17:45' });
    expect(day.timeline).toHaveLength(1); // nada de "Tempo livre" forçado
    expect(day.verdict).toBe('OK');
  });

  it('aceita horário fora da antiga janela (23:30)', () => {
    const day = buildAdaptedDay(deps([eb(1, 1, '23:30', '23:50', 20)]));
    expect(day.timeline.find((i) => i.key === 'routine-1')).toMatchObject({ start: '23:30', end: '23:50' });
  });

  it('vários blocos ficam nos seus horários, ordenados, com lacunas', () => {
    const day = buildAdaptedDay(deps([eb(1, 1, '17:00', '17:45', 45), eb(2, 2, '08:00', '09:00', 60)]));
    expect(day.timeline.map((i) => i.start)).toEqual(['08:00', '17:00']);
    expect(day.timeline).toHaveLength(2);
  });
});
