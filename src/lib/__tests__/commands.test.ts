import { parseCommand } from '../commands';
import type { CommandDeps } from '../commands';

const deps: CommandDeps = {
  today: new Date(2026, 5, 8), // 2026-06-08
  holidaysForYear: () => [
    { date: '2026-04-21', name: 'Tiradentes' },
    { date: '2026-12-25', name: 'Natal' },
  ],
  holidaysInMonth: (m) => (m === 3 ? [{ date: '2026-04-21', name: 'Tiradentes' }] : []),
  adaptedDay: () => ['Dia adaptado'],
  week: () => ['Semana'],
  training: () => ['Treino de hoje'],
  studies: () => ['Estudos de hoje'],
  monthly: () => ['Mensais'],
  nextBlock: () => 'Próximo: Almoço 12:00',
  topicTime: (t) => (t === 'Inglês' ? { minutes: 120, sessions: 4 } : { minutes: 0, sessions: 0 }),
};

describe('parseCommand — routing', () => {
  it('/ajuda lists commands', () => {
    expect(parseCommand('/ajuda', deps).lines[0]).toMatch(/Comandos/);
  });

  it('routes /hoje, /semana, /treino, /estudos, /mensais', () => {
    expect(parseCommand('/hoje', deps).lines).toEqual(['Dia adaptado']);
    expect(parseCommand('/treino', deps).lines).toEqual(['Treino de hoje']);
    expect(parseCommand('/estudos', deps).lines).toEqual(['Estudos de hoje']);
    expect(parseCommand('/mensais', deps).lines).toEqual(['Mensais']);
  });

  it('/proximo returns the next block', () => {
    expect(parseCommand('/proximo', deps).lines[0]).toMatch(/Almoço/);
  });

  it('unknown command points to /ajuda', () => {
    expect(parseCommand('oi tudo bem', deps).lines[0]).toMatch(/\/ajuda/);
    expect(parseCommand('/xyz', deps).lines[0]).toMatch(/Não reconheci/);
  });
});

describe('parseCommand — feriados', () => {
  it('/feriados lists the year', () => {
    const r = parseCommand('/feriados', deps);
    expect(r.lines).toContain('21/04 — Tiradentes');
    expect(r.lines).toContain('25/12 — Natal');
  });

  it('/feriados-abril lists April', () => {
    expect(parseCommand('/feriados-abril', deps).lines).toContain('21/04 — Tiradentes');
  });

  it('handles month accents/case (/feriados-MARÇO and -marco map to março)', () => {
    expect(parseCommand('/feriados-MARÇO', deps).lines[0]).toMatch(/Sem feriados em março/);
    expect(parseCommand('/feriados-marco', deps).lines[0]).toMatch(/Sem feriados em março/);
  });

  it('rejects an invalid month', () => {
    expect(parseCommand('/feriados-foo', deps).lines[0]).toMatch(/não reconhecido/i);
  });
});

describe('parseCommand — /tempo', () => {
  it('resolves accentless topic (ingles → Inglês) and formats time', () => {
    expect(parseCommand('/tempo ingles', deps).lines[0]).toBe('Inglês neste mês: 2h (4 sessões).');
  });

  it('is case/accent insensitive', () => {
    expect(parseCommand('/TEMPO Inglês', deps).lines[0]).toBe('Inglês neste mês: 2h (4 sessões).');
  });

  it('asks for a topic when missing, and reports unknown topics', () => {
    expect(parseCommand('/tempo', deps).lines[0]).toMatch(/Informe o tema/);
    expect(parseCommand('/tempo quimica', deps).lines[0]).toMatch(/não encontrado/);
  });
});
