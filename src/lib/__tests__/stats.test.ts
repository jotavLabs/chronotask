import {
  consistency,
  monthRange,
  timeByCategory,
  timeByTopic,
  trainingVolume,
} from '../stats';
import type { CompletedBlock } from '../stats';

const COMPLETED: CompletedBlock[] = [
  { date: '2026-06-01', topic: 'Inglês', category: 'Estudo', durationMin: 30 },
  { date: '2026-06-02', topic: 'Inglês', category: 'Estudo', durationMin: 30 },
  { date: '2026-06-03', topic: 'Inglês', category: 'Estudo', durationMin: 30 },
  { date: '2026-06-04', topic: 'Inglês', category: 'Estudo', durationMin: 30 },
  { date: '2026-06-02', topic: 'Matemática', category: 'Estudo', durationMin: 45 },
  { date: '2026-06-02', topic: null, category: 'Treino', durationMin: 90 },
  { date: '2026-06-05', topic: null, category: 'Leitura', durationMin: 45 },
  { date: '2026-06-05', topic: null, category: 'Alimentação', durationMin: 60 }, // excluded
];

describe('monthRange', () => {
  it('returns the first and last day of the month', () => {
    expect(monthRange(2026, 5)).toEqual({ startIso: '2026-06-01', endIso: '2026-06-30' });
    expect(monthRange(2026, 1)).toEqual({ startIso: '2026-02-01', endIso: '2026-02-28' });
  });
});

describe('timeByTopic', () => {
  it('sums sessions × duration per topic (the requested metric)', () => {
    const r = timeByTopic(COMPLETED);
    expect(r.find((t) => t.topic === 'Inglês')).toEqual({ topic: 'Inglês', minutes: 120, sessions: 4 });
    expect(r.find((t) => t.topic === 'Matemática')).toEqual({ topic: 'Matemática', minutes: 45, sessions: 1 });
  });

  it('ignores blocks without a topic', () => {
    expect(timeByTopic(COMPLETED).some((t) => t.topic == null)).toBe(false);
  });
});

describe('timeByCategory', () => {
  it('includes only trackable categories', () => {
    const r = timeByCategory(COMPLETED);
    const names = r.map((c) => c.category);
    expect(names).toContain('Treino');
    expect(names).toContain('Leitura');
    expect(names).not.toContain('Alimentação'); // excluded
    expect(r.find((c) => c.category === 'Treino')?.minutes).toBe(90);
  });
});

describe('consistency', () => {
  it('computes percent completed vs scheduled', () => {
    const r = consistency({ Inglês: 5, Matemática: 4 }, { Inglês: 4, Matemática: 4 });
    expect(r.find((x) => x.key === 'Inglês')).toEqual({ key: 'Inglês', scheduled: 5, completed: 4, percent: 80 });
    expect(r.find((x) => x.key === 'Matemática')?.percent).toBe(100);
  });

  it('handles zero scheduled without dividing by zero', () => {
    expect(consistency({}, { X: 2 })[0]).toEqual({ key: 'X', scheduled: 0, completed: 2, percent: 0 });
  });
});

describe('trainingVolume', () => {
  it('sums reps per exercise', () => {
    const r = trainingVolume([
      { exercise: 'Pull-up', reps: 5 },
      { exercise: 'Pull-up', reps: 4 },
      { exercise: 'Pistol', reps: 3 },
    ]);
    expect(r.find((v) => v.exercise === 'Pull-up')?.reps).toBe(9);
    expect(r.find((v) => v.exercise === 'Pistol')?.reps).toBe(3);
  });
});
