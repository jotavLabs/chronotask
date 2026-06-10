import { buildNotificationPlan, DEFAULT_NOTIF_PREFS } from '../notifications';
import type { MonthlyNotif, NotifPrefs } from '../notifications';
import type { AdaptedDay, TimelineItem, TimelineSource } from '../adaptationEngine';

const DATE = new Date(2026, 5, 8); // 2026-06-08

function ti(start: string, activity: string, category: string | null, source: TimelineSource = 'routine'): TimelineItem {
  return {
    key: `${source}-1`, refId: 1, start, end: start, activity, category, source,
    adapted: false, originalDuration: 0, adaptedDuration: 0, removed: false,
  };
}

function day(timeline: TimelineItem[], verdict: AdaptedDay['verdict'] = 'AJUSTADO'): AdaptedDay {
  return {
    date: '2026-06-08', mode: 'NORMAL', demand: 0, timeline,
    cutsByLevel: [], conflicts: [], shortfall: 0, verdict, holidayName: null,
  };
}

const TIMELINE = [
  ti('07:00', 'Estudo matinal', 'Estudo'),
  ti('08:30', 'Trabalho', 'Trabalho'),
  ti('14:00', 'Treino', 'Treino'),
  ti('16:00', 'Reunião', null, 'event'),
  ti('19:00', 'Tempo livre', 'Lazer'),
  ti('22:00', 'Sono', 'Sono'),
];

const prefs = (over: Partial<NotifPrefs> = {}): NotifPrefs => ({ ...DEFAULT_NOTIF_PREFS, enabled: true, ...over });

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('buildNotificationPlan', () => {
  it('returns nothing when disabled', () => {
    expect(buildNotificationPlan(DATE, day(TIMELINE), [], { ...DEFAULT_NOTIF_PREFS, enabled: false })).toEqual([]);
  });

  it('scope "importantes" = Treino/Estudo/Cardio + events (no Trabalho/Lazer)', () => {
    const p = buildNotificationPlan(DATE, day(TIMELINE), [], prefs({ scope: 'importantes', dailySummary: false }));
    const titles = p.filter((n) => n.type === 'block').map((n) => n.title);
    expect(titles).toEqual(['Estudo matinal', 'Treino', 'Reunião']);
  });

  it('scope "todos" includes every non-sleep block', () => {
    const p = buildNotificationPlan(DATE, day(TIMELINE), [], prefs({ scope: 'todos', dailySummary: false }));
    const titles = p.filter((n) => n.type === 'block').map((n) => n.title);
    expect(titles).toContain('Trabalho');
    expect(titles).toContain('Tempo livre');
    expect(titles).not.toContain('Sono'); // sleep block excluded
  });

  it('scope "nenhum" emits no block notifications', () => {
    const p = buildNotificationPlan(DATE, day(TIMELINE), [], prefs({ scope: 'nenhum', dailySummary: false }));
    expect(p.filter((n) => n.type === 'block')).toHaveLength(0);
  });

  it('applies leadMin before the block start', () => {
    const p = buildNotificationPlan(DATE, day([ti('14:00', 'Treino', 'Treino')]), [], prefs({ leadMin: 15, dailySummary: false }));
    expect(hhmm(p[0].when)).toBe('13:45');
  });

  it('never schedules during sleep (block at 22:00 dropped)', () => {
    const p = buildNotificationPlan(DATE, day([ti('22:00', 'Tarde', 'Estudo')]), [], prefs({ scope: 'todos', dailySummary: false }));
    expect(p).toHaveLength(0);
  });

  it('adds a daily summary at wake time (06:00)', () => {
    const p = buildNotificationPlan(DATE, day(TIMELINE), [], prefs({ scope: 'nenhum', dailySummary: true }));
    const summary = p.find((n) => n.type === 'daily');
    expect(summary).toBeDefined();
    expect(hhmm(summary!.when)).toBe('06:00');
  });

  it('notifies monthly routines on AGENDAR and ATRASADA only', () => {
    const monthly: MonthlyNotif[] = [
      { name: 'Cabelo', status: 'AGENDAR', windowStartDay: 11, windowEndDay: 17 },
      { name: 'Contas', status: 'ATRASADA', windowStartDay: 3, windowEndDay: 7 },
      { name: 'Feita', status: 'FEITA', windowStartDay: 1, windowEndDay: 5 },
    ];
    const p = buildNotificationPlan(DATE, day([]), monthly, prefs({ scope: 'nenhum', dailySummary: false, monthly: true }));
    const bodies = p.map((n) => n.body);
    expect(bodies.some((b) => b.includes('Hora de agendar: Cabelo'))).toBe(true);
    expect(bodies.some((b) => b.includes('Contas está atrasada'))).toBe(true);
    expect(bodies.some((b) => b.includes('Feita'))).toBe(false);
  });
});
