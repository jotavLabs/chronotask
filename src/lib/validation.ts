// Pure domain helpers: time parsing, duration (with midnight wrap) and form
// validations. No DB, no React — fully unit-testable.

export type TimeParts = { h: number; m: number };
export type ValidationResult = { ok: boolean; errors: Record<string, string> };

const MINUTES_IN_DAY = 1440;

// ─── time helpers ─────────────────────────────────────────────────────────────

/** Parses "HH:MM" (24h). Returns null when malformed or out of range. */
export function parseTime(value: string): TimeParts | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

export function isValidTime(value: string): boolean {
  return parseTime(value) !== null;
}

export function timeToMinutes(value: string): number | null {
  const t = parseTime(value);
  return t ? t.h * 60 + t.m : null;
}

export function minutesToTime(total: number): string {
  const t = ((total % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Duration in minutes between two HH:MM times.
 * Midnight wrap: when end <= start the block crosses midnight, so the
 * duration is (24:00 − start) + end. Returns null if either time is invalid.
 */
export function computeDuration(start: string, end: string): number | null {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s === null || e === null) return null;
  return e > s ? e - s : MINUTES_IN_DAY - s + e;
}

/** Human-readable duration: 45 → "45min", 90 → "1h30", 480 → "8h". */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

/** Validates a "YYYY-MM-DD" calendar date (real day, respects month length). */
export function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const y = Number(match[1]);
  const mo = Number(match[2]);
  const d = Number(match[3]);
  if (mo < 1 || mo > 12) return false;
  const daysInMonth = new Date(y, mo, 0).getDate();
  return d >= 1 && d <= daysInMonth;
}

// ─── form validations ─────────────────────────────────────────────────────────

export type BlockFormInput = {
  start: string;
  end: string;
  activity: string;
  categoryId: number | null;
  note?: string;
};

export function validateBlock(input: BlockFormInput): ValidationResult {
  const errors: Record<string, string> = {};
  if (!input.activity.trim()) errors.activity = 'Informe a atividade';
  if (input.categoryId == null) errors.categoryId = 'Selecione uma categoria';
  if (!isValidTime(input.start)) errors.start = 'Início inválido (HH:MM)';
  if (!isValidTime(input.end)) errors.end = 'Fim inválido (HH:MM)';
  return { ok: Object.keys(errors).length === 0, errors };
}

export type MonthlyFormInput = {
  name: string;
  windowStartDay: number;
  windowEndDay: number;
  durationMin: number;
  categoryId: number | null;
  suggestedBlock?: string;
};

export function validateMonthly(input: MonthlyFormInput): ValidationResult {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) errors.name = 'Informe o nome';
  if (input.categoryId == null) errors.categoryId = 'Selecione uma categoria';
  if (!isWindowDay(input.windowStartDay)) errors.windowStartDay = 'Dia entre 1 e 31';
  if (!isWindowDay(input.windowEndDay)) errors.windowEndDay = 'Dia entre 1 e 31';
  if (
    isWindowDay(input.windowStartDay) &&
    isWindowDay(input.windowEndDay) &&
    input.windowStartDay > input.windowEndDay
  ) {
    errors.windowEndDay = 'Fim da janela antes do início';
  }
  if (!Number.isFinite(input.durationMin) || input.durationMin <= 0) {
    errors.durationMin = 'Duração deve ser maior que zero';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export type EventFormInput = {
  date: string;
  start: string;
  end: string;
  title: string;
  categoryId: number | null;
  priority: string;
};

export function validateEvent(input: EventFormInput): ValidationResult {
  const errors: Record<string, string> = {};
  if (!input.title.trim()) errors.title = 'Informe o título';
  if (input.categoryId == null) errors.categoryId = 'Selecione uma categoria';
  if (!isValidDate(input.date)) errors.date = 'Data inválida';
  if (!isValidTime(input.start)) errors.start = 'Início inválido (HH:MM)';
  if (!isValidTime(input.end)) errors.end = 'Fim inválido (HH:MM)';
  return { ok: Object.keys(errors).length === 0, errors };
}

function isWindowDay(day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= 31;
}
