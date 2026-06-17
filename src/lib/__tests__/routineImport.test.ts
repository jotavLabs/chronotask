import { buildImportPrompt, daysInOrder, normalizeRoutine, parseRoutineJson } from '../routineImport';

const KNOWN = ['Trabalho', 'Estudo/Exercício', 'Tempo Livre'];
const norm = (data: unknown) => normalizeRoutine(data, { knownCategories: KNOWN, defaultCategory: 'Tempo Livre' });

describe('parseRoutineJson', () => {
  it('strips code fences and parses', () => {
    const r = parseRoutineJson('```json\n{"tipo":"rotina","dias":{"Seg":[]}}\n```');
    expect(r.ok).toBe(true);
  });

  it('tolerates trailing commas and surrounding text', () => {
    const r = parseRoutineJson('Aqui está:\n{"dias":{"Seg":[],}}\nPronto!');
    expect(r.ok).toBe(true);
  });

  it('errors on invalid JSON or missing "dias"', () => {
    expect(parseRoutineJson('isso não é json').ok).toBe(false);
    const r = parseRoutineJson('{"nome":"x"}');
    expect(r.ok).toBe(false);
  });
});

describe('normalizeRoutine', () => {
  const data = {
    nome: 'Semana A',
    dias: {
      segunda: [
        { inicio: '9:30', fim: '10:00', atividade: 'Corrida', categoria: 'Estudo/Exercício' },
        { inicio: '11:00', fim: '12:00', atividade: 'Trabalho', categoria: 'Trabalho' },
      ],
      'sexta-feira': [{ inicio: 'xx:yy', fim: '10:00', atividade: 'Inválido', categoria: 'Trabalho' }],
      Qua: [{ inicio: '08:00', fim: '09:00', atividade: 'Algo', categoria: 'Inexistente' }],
      Marte: [],
    },
  };

  it('normalizes day aliases and times', () => {
    const r = norm(data);
    expect(r.name).toBe('Semana A');
    expect(r.byDay.Seg?.[0]).toMatchObject({ start: '09:30', end: '10:00', dayLabel: 'Seg' });
  });

  it('drops invalid times and maps unknown categories to the default (with warnings)', () => {
    const r = norm(data);
    expect(r.byDay.Sex).toBeUndefined(); // only block was invalid → day empty/absent
    expect(r.byDay.Qua?.[0].catName).toBe('Tempo Livre');
    expect(r.warnings.some((w) => /horário inválido/.test(w))).toBe(true);
    expect(r.warnings.some((w) => /Inexistente/.test(w))).toBe(true);
    expect(r.warnings.some((w) => /Marte/.test(w))).toBe(true);
  });

  it('fills internal gaps with Tempo Livre', () => {
    const r = norm(data);
    // Seg: 09:30–10:00, gap, 11:00–12:00 → a filler 10:00–11:00
    const filler = r.byDay.Seg.find((b) => b.catName === 'Tempo Livre');
    expect(filler).toMatchObject({ start: '10:00', end: '11:00', durationMin: 60 });
  });

  it('daysInOrder returns populated days in week order', () => {
    const r = norm(data);
    expect(daysInOrder(r.byDay)).toEqual(['Seg', 'Qua']);
  });
});

describe('buildImportPrompt', () => {
  it('embeds the categories and valid day labels', () => {
    const p = buildImportPrompt(['Trabalho', 'Sono']);
    expect(p).toMatch(/Trabalho, Sono/);
    expect(p).toMatch(/Seg, Ter, Qua, Qui, Sex, Sab, Dom/);
    expect(p).toMatch(/APENAS com o JSON/);
  });
});
