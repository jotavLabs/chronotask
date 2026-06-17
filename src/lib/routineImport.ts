// Pure parsing/validation/normalization for AI-generated routine JSON. No DB/UI.

import type { DayLabel } from './dayResolver';
import { placementDuration } from './repack';
import { minutesToTime, timeToMinutes } from './validation';

export type ImportedBlock = {
  dayLabel: DayLabel;
  start: string;
  end: string;
  durationMin: number;
  activity: string;
  catName: string;
};

export type NormalizedRoutine = {
  name: string;
  blocks: ImportedBlock[];
  byDay: Record<DayLabel, ImportedBlock[]>;
  warnings: string[];
};

export type ParseResult = { ok: true; data: unknown } | { ok: false; error: string };

const DAY_ORDER: DayLabel[] = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
const FREE_NAME = 'Tempo Livre';

const deaccent = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

const DAY_ALIASES: Record<string, DayLabel> = {
  seg: 'Seg', segunda: 'Seg', 'segunda-feira': 'Seg', monday: 'Seg', mon: 'Seg',
  ter: 'Ter', terca: 'Ter', 'terca-feira': 'Ter', tuesday: 'Ter', tue: 'Ter',
  qua: 'Qua', quarta: 'Qua', 'quarta-feira': 'Qua', wednesday: 'Qua', wed: 'Qua',
  qui: 'Qui', quinta: 'Qui', 'quinta-feira': 'Qui', thursday: 'Qui', thu: 'Qui',
  sex: 'Sex', sexta: 'Sex', 'sexta-feira': 'Sex', friday: 'Sex', fri: 'Sex',
  sab: 'Sab', sabado: 'Sab', saturday: 'Sab', sat: 'Sab',
  dom: 'Dom', domingo: 'Dom', sunday: 'Dom', sun: 'Dom',
};

function normDay(raw: string): DayLabel | null {
  return DAY_ALIASES[deaccent(raw)] ?? null;
}

function normTime(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const m = timeToMinutes(raw.trim());
  if (m == null || m < 0 || m >= 1440) return null;
  return minutesToTime(m);
}

/** Builds the copy-paste prompt, embedding the user's categories and valid day labels. */
export function buildImportPrompt(categories: string[], modelName = 'Minha rotina'): string {
  const cats = categories.length ? categories.join(', ') : 'Trabalho, Sono, Alimentação, Estudo/Exercício, Tempo Livre';
  return [
    'Você vai gerar a minha rotina semanal em JSON. Faça perguntas se precisar e, no final, responda APENAS com o JSON (sem texto antes/depois e SEM cercas de código).',
    '',
    'Regras:',
    `- Dias válidos (use exatamente estes rótulos): ${DAY_ORDER.join(', ')}.`,
    `- "categoria" deve ser uma destas (exatamente): ${cats}.`,
    '- Horários no formato "HH:MM" em 24h (ex.: "09:30", "14:00").',
    '- Cada bloco: {"inicio","fim","atividade","categoria"}. Pode deixar dias vazios ([]).',
    '- Não inclua comentários nem vírgulas sobrando.',
    '',
    'Formato exato:',
    JSON.stringify(
      {
        tipo: 'rotina',
        nome: modelName,
        dias: {
          Seg: [{ inicio: '09:30', fim: '10:10', atividade: 'Corrida matinal', categoria: 'Estudo/Exercício' }],
          Ter: [],
        },
      },
      null,
      2,
    ),
  ].join('\n');
}

/** Strips code fences / stray text and trailing commas, then JSON.parse. */
export function parseRoutineJson(raw: string): ParseResult {
  if (!raw || !raw.trim()) return { ok: false, error: 'Arquivo vazio.' };
  let s = raw.trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last <= first) return { ok: false, error: 'JSON inválido — gere de novo com o prompt.' };
  s = s.slice(first, last + 1).replace(/,(\s*[}\]])/g, '$1'); // drop trailing commas
  try {
    const data = JSON.parse(s);
    if (!data || typeof data !== 'object') return { ok: false, error: 'JSON inválido — gere de novo com o prompt.' };
    if (typeof (data as { dias?: unknown }).dias !== 'object' || (data as { dias?: unknown }).dias == null) {
      return { ok: false, error: 'Faltou o campo "dias" no JSON.' };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'JSON inválido — gere de novo com o prompt.' };
  }
}

/** Inserts "Tempo Livre" blocks in the internal gaps of a (sorted) day so it reads contiguous. */
function fillGaps(day: ImportedBlock[]): ImportedBlock[] {
  const sorted = [...day].sort((a, b) => (timeToMinutes(a.start) ?? 0) - (timeToMinutes(b.start) ?? 0));
  const out: ImportedBlock[] = [];
  for (let i = 0; i < sorted.length; i++) {
    out.push(sorted[i]);
    const cur = sorted[i];
    const next = sorted[i + 1];
    if (!next) continue;
    const curEnd = timeToMinutes(cur.end) ?? 0;
    const nextStart = timeToMinutes(next.start) ?? 0;
    if (nextStart > curEnd) {
      out.push({
        dayLabel: cur.dayLabel,
        start: minutesToTime(curEnd),
        end: minutesToTime(nextStart),
        durationMin: nextStart - curEnd,
        activity: 'Tempo livre',
        catName: FREE_NAME,
      });
    }
  }
  return out;
}

/**
 * Normalizes parsed JSON: day-name aliases, valid times, categories restricted to
 * `knownCategories` (unknown → `defaultCategory` with a warning), and gap-filling.
 */
export function normalizeRoutine(
  data: unknown,
  opts: { knownCategories: string[]; defaultCategory: string },
): NormalizedRoutine {
  const obj = data as { nome?: unknown; dias?: Record<string, unknown> };
  const name = (typeof obj.nome === 'string' && obj.nome.trim()) || 'Rotina importada';
  const known = new Set(opts.knownCategories);
  const warnings: string[] = [];
  const byDay = {} as Record<DayLabel, ImportedBlock[]>;
  const blocks: ImportedBlock[] = [];

  for (const [rawDay, list] of Object.entries(obj.dias ?? {})) {
    const dl = normDay(rawDay);
    if (!dl) {
      warnings.push(`Dia ignorado: "${rawDay}".`);
      continue;
    }
    const items = Array.isArray(list) ? list : [];
    const dayBlocks: ImportedBlock[] = [];
    for (const it of items) {
      const item = it as { inicio?: unknown; fim?: unknown; atividade?: unknown; categoria?: unknown };
      const start = normTime(item.inicio);
      const end = normTime(item.fim);
      if (!start || !end) {
        warnings.push(`${dl}: bloco com horário inválido ignorado.`);
        continue;
      }
      let cat = typeof item.categoria === 'string' ? item.categoria.trim() : '';
      if (!known.has(cat)) {
        if (cat) warnings.push(`Categoria "${cat}" não existe → ${opts.defaultCategory}.`);
        cat = opts.defaultCategory;
      }
      const activity = (typeof item.atividade === 'string' && item.atividade.trim()) || 'Atividade';
      dayBlocks.push({ dayLabel: dl, start, end, durationMin: placementDuration(start, end), activity, catName: cat });
    }
    if (dayBlocks.length === 0) continue; // skip empty days
    const filled = fillGaps(dayBlocks);
    byDay[dl] = filled;
    blocks.push(...filled);
  }

  return { name, blocks, byDay, warnings };
}

/** Days present in the normalized routine, in week order. */
export function daysInOrder(byDay: Record<string, ImportedBlock[]>): DayLabel[] {
  return DAY_ORDER.filter((d) => (byDay[d]?.length ?? 0) > 0);
}
