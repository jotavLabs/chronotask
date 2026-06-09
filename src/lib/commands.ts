// Pure command parser for the chat screen. No DB — data comes via injected deps,
// so it's fully testable and ready to forward free text to an LLM later (S8).

import { KNOWN_TOPICS } from './topics';
import { formatDuration } from './validation';

export type CommandResult = { lines: string[] };

export type CommandDeps = {
  today: Date;
  holidaysForYear: () => { date: string; name: string }[];
  holidaysInMonth: (month: number) => { date: string; name: string }[]; // month 0–11
  adaptedDay: (date: Date) => string[];
  week: () => string[];
  training: (date: Date) => string[];
  studies: (date: Date) => string[];
  monthly: () => string[];
  nextBlock: (date: Date) => string | null;
  topicTime: (topic: string) => { minutes: number; sessions: number };
};

const MONTHS: Record<string, number> = {
  janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function deaccent(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function norm(s: string): string {
  return deaccent(s.trim().toLowerCase());
}
function fmtDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

const HELP: string[] = [
  'Comandos disponíveis:',
  '/hoje — dia adaptado de hoje',
  '/semana — visão geral da semana',
  '/treino — treino de hoje',
  '/estudos — temas de estudo de hoje',
  '/mensais — rotinas mensais e status',
  '/proximo — próximo bloco a partir de agora',
  '/feriados — feriados do ano',
  '/feriados-<mês> — feriados do mês (ex.: /feriados-abril)',
  '/tempo <tema> — tempo dedicado no mês (ex.: /tempo ingles)',
  '/ajuda — esta lista',
];

export function parseCommand(input: string, deps: CommandDeps): CommandResult {
  const n = norm(input);
  const parts = n.split(/\s+/);
  const cmd = parts[0];
  const arg = parts.slice(1).join(' ');

  if (cmd === '/ajuda' || cmd === 'ajuda') return { lines: HELP };

  if (cmd === '/feriados') {
    const hs = deps.holidaysForYear();
    if (hs.length === 0) return { lines: ['Nenhum feriado cadastrado para o ano.'] };
    return { lines: [`Feriados de ${deps.today.getFullYear()}:`, ...hs.map((h) => `${fmtDate(h.date)} — ${h.name}`)] };
  }

  if (cmd.startsWith('/feriados-')) {
    const monthKey = cmd.slice('/feriados-'.length);
    const month = MONTHS[monthKey];
    if (month === undefined) return { lines: [`Mês "${monthKey}" não reconhecido. Ex.: /feriados-abril`] };
    const hs = deps.holidaysInMonth(month);
    const label = MONTH_NAMES[month];
    if (hs.length === 0) return { lines: [`Sem feriados em ${label}.`] };
    return { lines: [`Feriados de ${label}:`, ...hs.map((h) => `${fmtDate(h.date)} — ${h.name}`)] };
  }

  if (cmd === '/hoje') return { lines: deps.adaptedDay(deps.today) };
  if (cmd === '/semana') return { lines: deps.week() };
  if (cmd === '/treino') return { lines: deps.training(deps.today) };
  if (cmd === '/estudos') return { lines: deps.studies(deps.today) };
  if (cmd === '/mensais') return { lines: deps.monthly() };

  if (cmd === '/proximo') {
    const next = deps.nextBlock(deps.today);
    return { lines: [next ?? 'Nenhum bloco restante hoje.'] };
  }

  if (cmd === '/tempo') {
    if (!arg) return { lines: ['Informe o tema. Ex.: /tempo ingles'] };
    const topic = KNOWN_TOPICS.find((t) => deaccent(t.toLowerCase()).includes(arg));
    if (!topic) return { lines: [`Tema "${arg}" não encontrado. Temas: ${KNOWN_TOPICS.join(', ')}`] };
    const { minutes, sessions } = deps.topicTime(topic);
    if (sessions === 0) return { lines: [`${topic}: nenhuma sessão concluída neste mês.`] };
    return { lines: [`${topic} neste mês: ${formatDuration(minutes)} (${sessions} sessões).`] };
  }

  return { lines: ['Não reconheci. Digite /ajuda.'] };
}

export const COMMAND_LIST = [
  '/hoje', '/semana', '/treino', '/estudos', '/mensais',
  '/proximo', '/feriados', '/tempo ', '/ajuda',
];
