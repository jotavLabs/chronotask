import { getTemplate, getTemplates } from '../templates';
import type { DayLabel } from '../dayResolver';

const DAYS: DayLabel[] = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
const KNOWN_CATS = new Set(['Trabalho', 'Sono', 'Alimentação', 'Higiene/Pessoal', 'Estudo/Exercício', 'Tempo Livre']);

const toMin = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

describe('templates registry', () => {
  it('exposes "vazio" (empty) and "generica"', () => {
    const ids = getTemplates().map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(['vazio', 'generica']));
    expect(getTemplate('vazio')?.blocks).toEqual([]);
    expect(getTemplate('inexistente')).toBeUndefined();
  });

  it('generica covers all 7 days', () => {
    const blocks = getTemplate('generica')!.blocks;
    for (const d of DAYS) {
      expect(blocks.some((b) => b.dayLabel === d)).toBe(true);
    }
  });

  it('every generica block uses a known default category', () => {
    for (const b of getTemplate('generica')!.blocks) {
      expect(KNOWN_CATS.has(b.catName)).toBe(true);
    }
  });

  it('each day is a contiguous 24h with durations matching start/end', () => {
    const blocks = getTemplate('generica')!.blocks;
    for (const d of DAYS) {
      const day = blocks.filter((b) => b.dayLabel === d).sort((a, b) => a.sortOrder - b.sortOrder);
      let sum = 0;
      for (let i = 0; i < day.length; i++) {
        const b = day[i];
        const span = (toMin(b.end) - toMin(b.start) + 1440) % 1440 || 1440;
        expect(b.durationMin).toBe(span); // duration matches the clock span
        sum += b.durationMin;
        const next = day[(i + 1) % day.length];
        expect(b.end).toBe(next.start); // contiguous (last wraps to first)
      }
      expect(sum).toBe(1440); // full day, no gaps/overlaps
    }
  });
});
