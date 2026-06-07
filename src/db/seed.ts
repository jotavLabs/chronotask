import { db } from './client';
import {
  categories,
  completions,
  holidays,
  monthlyRoutines,
  routineBlocks,
} from './schema';

type BlockInput = {
  dayLabel: string;
  start: string;
  end: string;
  durationMin: number;
  activity: string;
  catName: string;
  note?: string;
  sortOrder: number;
};

// ─── helpers ────────────────────────────────────────────────────────────────

function morning(dayLabel: string, studyNote: string): BlockInput[] {
  return [
    { dayLabel, start: '06:00', end: '06:15', durationMin: 15, activity: 'Higiene matinal', catName: 'Rotina', sortOrder: 1 },
    { dayLabel, start: '06:15', end: '06:45', durationMin: 30, activity: 'Café da manhã', catName: 'Alimentação', sortOrder: 2 },
    { dayLabel, start: '06:45', end: '07:00', durationMin: 15, activity: 'Louça e arrumar cama', catName: 'Rotina', sortOrder: 3 },
    { dayLabel, start: '07:00', end: '07:15', durationMin: 15, activity: 'Mini alongamento (despertar)', catName: 'Mobilidade', sortOrder: 4 },
    { dayLabel, start: '07:15', end: '08:00', durationMin: 45, activity: 'Estudo matinal (deep work)', catName: 'Estudo', note: studyNote, sortOrder: 5 },
    { dayLabel, start: '08:00', end: '08:30', durationMin: 30, activity: 'Preparo para trabalho', catName: 'Rotina', sortOrder: 6 },
    { dayLabel, start: '08:30', end: '12:00', durationMin: 210, activity: 'Trabalho', catName: 'Trabalho', sortOrder: 7 },
    { dayLabel, start: '12:00', end: '13:00', durationMin: 60, activity: 'Almoço', catName: 'Alimentação', sortOrder: 8 },
    { dayLabel, start: '13:00', end: '13:30', durationMin: 30, activity: 'Trabalho', catName: 'Trabalho', sortOrder: 9 },
  ];
}

function treinoAfternoon(dayLabel: string, treinoLabel: string, studoLabel: string, baseSort = 10): BlockInput[] {
  return [
    { dayLabel, start: '13:30', end: '14:15', durationMin: 45, activity: 'Tempo livre', catName: 'Lazer', sortOrder: baseSort },
    { dayLabel, start: '14:15', end: '15:45', durationMin: 90, activity: `TREINO — ${treinoLabel}`, catName: 'Treino', sortOrder: baseSort + 1 },
    { dayLabel, start: '15:45', end: '16:05', durationMin: 20, activity: 'Alongamento pós-treino', catName: 'Mobilidade', sortOrder: baseSort + 2 },
    { dayLabel, start: '16:05', end: '16:30', durationMin: 25, activity: 'Café da tarde', catName: 'Alimentação', sortOrder: baseSort + 3 },
    { dayLabel, start: '16:40', end: '17:30', durationMin: 50, activity: `Estudo: ${studoLabel}`, catName: 'Estudo', sortOrder: baseSort + 4 },
    { dayLabel, start: '17:30', end: '18:30', durationMin: 60, activity: 'Tempo livre', catName: 'Lazer', sortOrder: baseSort + 5 },
  ];
}

function evening(dayLabel: string, baseSort = 16): BlockInput[] {
  return [
    { dayLabel, start: '18:30', end: '19:15', durationMin: 45, activity: 'Jantar', catName: 'Alimentação', sortOrder: baseSort },
    { dayLabel, start: '19:15', end: '19:45', durationMin: 30, activity: 'Inglês (Anki + escuta)', catName: 'Estudo', sortOrder: baseSort + 1 },
    { dayLabel, start: '19:45', end: '20:45', durationMin: 60, activity: 'Tempo livre / hobby', catName: 'Lazer', sortOrder: baseSort + 2 },
    { dayLabel, start: '20:45', end: '21:15', durationMin: 30, activity: 'Higiene noturna (telas off)', catName: 'Rotina', sortOrder: baseSort + 3 },
    { dayLabel, start: '21:15', end: '22:00', durationMin: 45, activity: 'Leitura', catName: 'Leitura', sortOrder: baseSort + 4 },
    { dayLabel, start: '22:00', end: '06:00', durationMin: 480, activity: 'Sono', catName: 'Sono', sortOrder: baseSort + 5 },
  ];
}

// ─── categories data ─────────────────────────────────────────────────────────

const CAT_DATA = [
  { name: 'Trabalho', cutOrder: null, tieGroup: null, protected: 1, color: '#3B82F6' },
  { name: 'Sono',     cutOrder: 5,    tieGroup: null, protected: 0, color: '#8B5CF6' },
  { name: 'Rotina',   cutOrder: 4,    tieGroup: null, protected: 0, color: '#6B7280' },
  { name: 'Alimentação', cutOrder: 3, tieGroup: null, protected: 0, color: '#F59E0B' },
  { name: 'Treino',   cutOrder: 2,    tieGroup: 'treino_estudo', protected: 0, color: '#EF4444' },
  { name: 'Estudo',   cutOrder: 2,    tieGroup: 'treino_estudo', protected: 0, color: '#10B981' },
  { name: 'Cardio',   cutOrder: 2,    tieGroup: 'treino_estudo', protected: 0, color: '#F97316' },
  { name: 'Mobilidade', cutOrder: 2,  tieGroup: 'treino_estudo', protected: 0, color: '#EC4899' },
  { name: 'Lazer',    cutOrder: 1,    tieGroup: null, protected: 0, color: '#06B6D4' },
  { name: 'Leitura',  cutOrder: 1,    tieGroup: null, protected: 0, color: '#84CC16' },
];

// ─── routine blocks data ──────────────────────────────────────────────────────

function buildAllBlocks(): BlockInput[] {
  return [
    // SEG
    ...morning('Seg', 'Matemática'),
    ...treinoAfternoon('Seg', 'Upper A', 'Inglês (TOEFL ativo)'),
    ...evening('Seg'),

    // TER
    ...morning('Ter', 'Cloud/AWS'),
    ...treinoAfternoon('Ter', 'Lower A', 'PM-CAPM'),
    ...evening('Ter'),

    // QUA (sem treino — cardio + 2 estudos)
    ...morning('Qua', 'Matemática'),
    { dayLabel: 'Qua', start: '13:30', end: '14:15', durationMin: 45, activity: 'Tempo livre', catName: 'Lazer', sortOrder: 10 },
    { dayLabel: 'Qua', start: '14:15', end: '14:45', durationMin: 30, activity: 'Cardio zona 2', catName: 'Cardio', sortOrder: 11 },
    { dayLabel: 'Qua', start: '14:45', end: '15:05', durationMin: 20, activity: 'Banho / transição', catName: 'Rotina', sortOrder: 12 },
    { dayLabel: 'Qua', start: '15:05', end: '15:55', durationMin: 50, activity: 'Estudo: Cloud / AWS', catName: 'Estudo', sortOrder: 13 },
    { dayLabel: 'Qua', start: '15:55', end: '16:20', durationMin: 25, activity: 'Café da tarde', catName: 'Alimentação', sortOrder: 14 },
    { dayLabel: 'Qua', start: '16:20', end: '17:10', durationMin: 50, activity: 'Estudo: Claude / IA', catName: 'Estudo', sortOrder: 15 },
    { dayLabel: 'Qua', start: '17:10', end: '18:30', durationMin: 80, activity: 'Tempo livre', catName: 'Lazer', sortOrder: 16 },
    ...evening('Qua', 17),

    // QUI
    ...morning('Qui', 'PM/CAPM'),
    ...treinoAfternoon('Qui', 'Upper B', 'Inglês (TOEFL ativo)'),
    ...evening('Qui'),

    // SEX
    ...morning('Sex', 'Redação'),
    ...treinoAfternoon('Sex', 'Lower B', 'Matemática'),
    ...evening('Sex'),

    // SAB (flexível)
    { dayLabel: 'Sab', start: '09:00', end: '09:45', durationMin: 45, activity: 'Cardio leve', catName: 'Cardio', note: 'Opcional', sortOrder: 1 },
    { dayLabel: 'Sab', start: '10:00', end: '10:30', durationMin: 30, activity: 'Mobilidade', catName: 'Mobilidade', note: 'Opcional', sortOrder: 2 },
    { dayLabel: 'Sab', start: '10:30', end: '21:15', durationMin: 645, activity: 'Dia flexível (voluntariado OU livre)', catName: 'Lazer', sortOrder: 3 },
    { dayLabel: 'Sab', start: '21:15', end: '22:00', durationMin: 45, activity: 'Leitura curta', catName: 'Leitura', note: 'Opcional', sortOrder: 4 },
    { dayLabel: 'Sab', start: '22:00', end: '06:00', durationMin: 480, activity: 'Sono', catName: 'Sono', sortOrder: 5 },

    // DOM
    { dayLabel: 'Dom', start: '08:00', end: '21:15', durationMin: 795, activity: 'Descanso total / tempo livre', catName: 'Lazer', sortOrder: 1 },
    { dayLabel: 'Dom', start: '21:15', end: '22:00', durationMin: 45, activity: 'Leitura curta', catName: 'Leitura', sortOrder: 2 },
    { dayLabel: 'Dom', start: '22:00', end: '06:00', durationMin: 480, activity: 'Sono', catName: 'Sono', sortOrder: 3 },

    // FERIADO
    { dayLabel: 'Feriado', start: '06:00', end: '07:00', durationMin: 60, activity: 'Manhã tranquila (higiene + café)', catName: 'Alimentação', sortOrder: 1 },
    { dayLabel: 'Feriado', start: '07:00', end: '07:15', durationMin: 15, activity: 'Mini alongamento', catName: 'Mobilidade', sortOrder: 2 },
    { dayLabel: 'Feriado', start: '07:15', end: '08:15', durationMin: 60, activity: 'Estudo prioritário 1 (Inglês/Matemática)', catName: 'Estudo', sortOrder: 3 },
    { dayLabel: 'Feriado', start: '08:15', end: '09:30', durationMin: 75, activity: 'Tempo livre', catName: 'Lazer', sortOrder: 4 },
    { dayLabel: 'Feriado', start: '09:30', end: '10:15', durationMin: 45, activity: 'Estudo prioritário 2', catName: 'Estudo', sortOrder: 5 },
    { dayLabel: 'Feriado', start: '10:15', end: '12:00', durationMin: 105, activity: 'Tempo livre / lazer', catName: 'Lazer', sortOrder: 6 },
    { dayLabel: 'Feriado', start: '12:00', end: '13:00', durationMin: 60, activity: 'Almoço', catName: 'Alimentação', sortOrder: 7 },
    { dayLabel: 'Feriado', start: '13:00', end: '14:15', durationMin: 75, activity: 'Tempo livre', catName: 'Lazer', sortOrder: 8 },
    { dayLabel: 'Feriado', start: '14:15', end: '15:45', durationMin: 90, activity: 'Treino (opcional)', catName: 'Treino', sortOrder: 9 },
    { dayLabel: 'Feriado', start: '15:45', end: '16:05', durationMin: 20, activity: 'Alongamento pós-treino', catName: 'Mobilidade', sortOrder: 10 },
    { dayLabel: 'Feriado', start: '16:05', end: '16:30', durationMin: 25, activity: 'Café da tarde', catName: 'Alimentação', sortOrder: 11 },
    { dayLabel: 'Feriado', start: '16:30', end: '18:30', durationMin: 120, activity: 'Tempo livre / lazer', catName: 'Lazer', sortOrder: 12 },
    { dayLabel: 'Feriado', start: '18:30', end: '19:15', durationMin: 45, activity: 'Jantar', catName: 'Alimentação', sortOrder: 13 },
    { dayLabel: 'Feriado', start: '19:15', end: '19:45', durationMin: 30, activity: 'Inglês (Anki + escuta)', catName: 'Estudo', sortOrder: 14 },
    { dayLabel: 'Feriado', start: '19:45', end: '21:15', durationMin: 90, activity: 'Tempo livre', catName: 'Lazer', sortOrder: 15 },
    { dayLabel: 'Feriado', start: '21:15', end: '22:00', durationMin: 45, activity: 'Leitura', catName: 'Leitura', sortOrder: 16 },
    { dayLabel: 'Feriado', start: '22:00', end: '06:00', durationMin: 480, activity: 'Sono', catName: 'Sono', sortOrder: 17 },
  ];
}

// ─── holidays data ────────────────────────────────────────────────────────────

const HOLIDAYS_2026 = [
  { date: '2026-01-01', name: 'Confraternização Universal', type: 'Nacional' },
  { date: '2026-01-25', name: 'Aniversário de São Paulo', type: 'Municipal' },
  { date: '2026-02-16', name: 'Carnaval (segunda-feira)', type: 'Facultativo' },
  { date: '2026-02-17', name: 'Carnaval (terça-feira)', type: 'Facultativo' },
  { date: '2026-02-18', name: 'Quarta-feira de Cinzas', type: 'Facultativo' },
  { date: '2026-04-03', name: 'Paixão de Cristo', type: 'Nacional' },
  { date: '2026-04-21', name: 'Tiradentes', type: 'Nacional' },
  { date: '2026-05-01', name: 'Dia do Trabalho', type: 'Nacional' },
  { date: '2026-06-04', name: 'Corpus Christi', type: 'Facultativo' },
  { date: '2026-07-09', name: 'Revolução Constitucionalista', type: 'Estadual' },
  { date: '2026-09-07', name: 'Independência do Brasil', type: 'Nacional' },
  { date: '2026-10-12', name: 'Nossa Senhora Aparecida', type: 'Nacional' },
  { date: '2026-11-02', name: 'Finados', type: 'Nacional' },
  { date: '2026-11-15', name: 'Proclamação da República', type: 'Nacional' },
  { date: '2026-11-20', name: 'Consciência Negra', type: 'Nacional' },
  { date: '2026-12-25', name: 'Natal', type: 'Nacional' },
  { date: '2027-01-01', name: 'Confraternização Universal', type: 'Nacional' },
];

// ─── monthly routines data ────────────────────────────────────────────────────

const MONTHLY_ROUTINES = [
  { name: 'Cortar o cabelo', windowStartDay: 11, windowEndDay: 17, durationMin: 60, suggestedBlock: 'Lazer' },
  { name: 'Pagar contas', windowStartDay: 3, windowEndDay: 7, durationMin: 30, suggestedBlock: 'Lazer' },
  { name: 'Limpeza pesada', windowStartDay: 1, windowEndDay: 7, durationMin: 90, suggestedBlock: 'Lazer' },
];

// ─── main seed function ───────────────────────────────────────────────────────

export function runSeed(): void {
  // Guard: don't seed if categories already exist
  const existing = db.select({ id: categories.id }).from(categories).limit(1).all();
  if (existing.length > 0) return;

  // Insert categories
  db.insert(categories).values(CAT_DATA).run();

  // Build name→id map
  const cats = db.select({ id: categories.id, name: categories.name }).from(categories).all();
  const catMap = new Map(cats.map((c) => [c.name, c.id]));

  const rotinaCatId = catMap.get('Rotina')!;

  // Insert routine blocks
  const blocks = buildAllBlocks();
  const blockRows = blocks.map((b) => ({
    dayLabel: b.dayLabel,
    start: b.start,
    end: b.end,
    durationMin: b.durationMin,
    activity: b.activity,
    categoryId: catMap.get(b.catName) ?? null,
    note: b.note ?? null,
    sortOrder: b.sortOrder,
  }));

  // Insert in batches of 50 to avoid parameter limits
  for (let i = 0; i < blockRows.length; i += 50) {
    db.insert(routineBlocks).values(blockRows.slice(i, i + 50)).run();
  }

  // Insert monthly routines
  db.insert(monthlyRoutines)
    .values(
      MONTHLY_ROUTINES.map((r) => ({
        name: r.name,
        windowStartDay: r.windowStartDay,
        windowEndDay: r.windowEndDay,
        durationMin: r.durationMin,
        suggestedBlock: r.suggestedBlock,
        categoryId: rotinaCatId,
      })),
    )
    .run();

  // Insert holidays
  for (let i = 0; i < HOLIDAYS_2026.length; i += 50) {
    db.insert(holidays).values(HOLIDAYS_2026.slice(i, i + 50)).run();
  }

  // completions starts empty
}
