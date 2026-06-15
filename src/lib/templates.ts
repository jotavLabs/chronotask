// Routine templates as DATA (not coupled code). Applied to any user from the
// onboarding start choice or from Ajustes. Category names must match the default
// categories (see db/seed). Pure module — no DB here.

import type { DayLabel } from './dayResolver';

export type TemplateBlock = {
  dayLabel: DayLabel;
  start: string; // HH:MM
  end: string;
  durationMin: number;
  activity: string;
  catName: string;
  sortOrder: number;
};

export type TemplateId = 'vazio' | 'generica';

export type RoutineTemplate = {
  id: TemplateId;
  name: string;
  description: string;
  blocks: TemplateBlock[];
};

const WEEKDAYS: DayLabel[] = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

type Row = Omit<TemplateBlock, 'dayLabel' | 'sortOrder'>;

const WEEKDAY_ROWS: Row[] = [
  { start: '07:00', end: '07:30', durationMin: 30, activity: 'Higiene matinal', catName: 'Higiene/Pessoal' },
  { start: '07:30', end: '08:00', durationMin: 30, activity: 'Café da manhã', catName: 'Alimentação' },
  { start: '08:00', end: '12:00', durationMin: 240, activity: 'Trabalho', catName: 'Trabalho' },
  { start: '12:00', end: '13:00', durationMin: 60, activity: 'Almoço', catName: 'Alimentação' },
  { start: '13:00', end: '17:00', durationMin: 240, activity: 'Trabalho', catName: 'Trabalho' },
  { start: '17:00', end: '18:00', durationMin: 60, activity: 'Tempo livre', catName: 'Tempo Livre' },
  { start: '18:00', end: '19:00', durationMin: 60, activity: 'Estudo / Exercício', catName: 'Estudo/Exercício' },
  { start: '19:00', end: '20:00', durationMin: 60, activity: 'Jantar', catName: 'Alimentação' },
  { start: '20:00', end: '22:30', durationMin: 150, activity: 'Tempo livre', catName: 'Tempo Livre' },
  { start: '22:30', end: '07:00', durationMin: 510, activity: 'Sono', catName: 'Sono' },
];

const WEEKEND_ROWS: Row[] = [
  { start: '07:00', end: '08:00', durationMin: 60, activity: 'Manhã tranquila', catName: 'Alimentação' },
  { start: '08:00', end: '12:00', durationMin: 240, activity: 'Tempo livre', catName: 'Tempo Livre' },
  { start: '12:00', end: '13:00', durationMin: 60, activity: 'Almoço', catName: 'Alimentação' },
  { start: '13:00', end: '19:00', durationMin: 360, activity: 'Tempo livre', catName: 'Tempo Livre' },
  { start: '19:00', end: '20:00', durationMin: 60, activity: 'Jantar', catName: 'Alimentação' },
  { start: '20:00', end: '22:30', durationMin: 150, activity: 'Tempo livre', catName: 'Tempo Livre' },
  { start: '22:30', end: '07:00', durationMin: 510, activity: 'Sono', catName: 'Sono' },
];

function day(dayLabel: DayLabel, rows: Row[]): TemplateBlock[] {
  return rows.map((r, i) => ({ ...r, dayLabel, sortOrder: i + 1 }));
}

const GENERICA_BLOCKS: TemplateBlock[] = [
  ...WEEKDAYS.flatMap((d) => day(d, WEEKDAY_ROWS)),
  ...day('Sab', WEEKEND_ROWS),
  ...day('Dom', WEEKEND_ROWS),
];

export const TEMPLATES: RoutineTemplate[] = [
  {
    id: 'vazio',
    name: 'Vazio',
    description: 'Comece sem blocos e monte sua rotina do zero.',
    blocks: [],
  },
  {
    id: 'generica',
    name: 'Rotina genérica',
    description: 'Um dia útil simples (trabalho, refeições, estudo/exercício, tempo livre) e fins de semana mais livres. Tudo editável.',
    blocks: GENERICA_BLOCKS,
  },
];

export function getTemplates(): RoutineTemplate[] {
  return TEMPLATES;
}

export function getTemplate(id: string): RoutineTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
