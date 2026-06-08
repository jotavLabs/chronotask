import {
  computeDemand,
  round5,
  runCascade,
} from '../adaptationEngine';
import type { EngineBlock, EngineCategory } from '../adaptationEngine';

// Categories mirroring the seed.
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

function block(id: number, categoryId: number, durationMin: number): EngineBlock {
  const name = CATS.find((c) => c.id === categoryId)?.name ?? null;
  return {
    id,
    activity: name ?? `b${id}`,
    start: '00:00',
    end: '00:00',
    durationMin,
    categoryId,
    categoryName: name,
    sortOrder: id,
  };
}

function durOf(blocks: Array<{ id: number; adaptedDuration: number }>, id: number) {
  return blocks.find((b) => b.id === id)!.adaptedDuration;
}

describe('round5 / computeDemand', () => {
  it('rounds to multiples of 5', () => {
    expect(round5(80.36)).toBe(80);
    expect(round5(44.64)).toBe(45);
    expect(round5(2.5)).toBe(5);
  });

  it('sums events and active monthly routines', () => {
    expect(
      computeDemand(
        [{ id: 1, title: 'x', start: '14:00', end: '15:00', durationMin: 60, categoryName: null }],
        [{ id: 1, name: 'Cabelo', durationMin: 60, suggestedBlock: null, categoryName: null }],
      ),
    ).toBe(120);
  });
});

describe('runCascade', () => {
  // Lazer 60 + Leitura 45 (lvl1), Treino 90 + Estudo 50 (lvl2), Trabalho 210 (protected), Sono 480 (lvl5)
  const blocks = [
    block(10, 7, 60), // Lazer
    block(11, 8, 45), // Leitura
    block(12, 5, 90), // Treino
    block(13, 6, 50), // Estudo
    block(14, 1, 210), // Trabalho (protected)
    block(15, 2, 480), // Sono
  ];

  it('cuts level 1 first, then proportionally into level 2', () => {
    const { adjusted, cutsByLevel, shortfall } = runCascade(blocks, CATS, 120);
    // level 1 fully consumed (105), 15 left → level 2 frac 15/140
    expect(durOf(adjusted, 10)).toBe(0); // Lazer
    expect(durOf(adjusted, 11)).toBe(0); // Leitura
    expect(durOf(adjusted, 12)).toBe(80); // Treino round5(90*0.893)
    expect(durOf(adjusted, 13)).toBe(45); // Estudo round5(50*0.893)
    expect(shortfall).toBe(0);
    expect(cutsByLevel[0]).toMatchObject({ cutOrder: 1, cut: 105, fracPct: 100 });
    expect(cutsByLevel[1]).toMatchObject({ cutOrder: 2, cut: 15 });
  });

  it('cuts a tied level by the same fraction (Treino+Estudo)', () => {
    // Only level-2 blocks, demand 70 → frac 0.5 → 45 and 25
    const lvl2 = [block(12, 5, 90), block(13, 6, 50)];
    const { adjusted } = runCascade(lvl2, CATS, 70);
    expect(durOf(adjusted, 12)).toBe(45);
    expect(durOf(adjusted, 13)).toBe(25);
  });

  it('never touches protected blocks', () => {
    const { adjusted } = runCascade(blocks, CATS, 2000);
    expect(durOf(adjusted, 14)).toBe(210); // Trabalho untouched
  });

  it('reports shortfall when demand exceeds all cuttable time', () => {
    const cuttableTotal = 60 + 45 + 90 + 50 + 480; // 725 (everything but Trabalho)
    const { shortfall } = runCascade(blocks, CATS, cuttableTotal + 100);
    expect(shortfall).toBe(100);
  });

  it('no demand → no cuts', () => {
    const { adjusted, cutsByLevel, shortfall } = runCascade(blocks, CATS, 0);
    expect(cutsByLevel).toHaveLength(0);
    expect(shortfall).toBe(0);
    expect(durOf(adjusted, 10)).toBe(60);
  });
});
