// Pure resolution of which routine model applies on a date. No DB/UI.
//
// Priority: explicit week/month assignment → rotation loop → none.

export type RotationPeriod = 'weekly' | 'monthly';

export type Rotation = {
  enabled: boolean;
  mode: string; // 'loop'
  period: RotationPeriod;
  anchorDate: string; // ISO YYYY-MM-DD
} | null;

export type RotationItem = { position: number; modelId: number };
export type WeekAssignment = { periodStart: string; modelId: number };

export type SchedulingConfig = {
  rotation: Rotation;
  items: RotationItem[];
  assignments: WeekAssignment[];
};

export type Resolution = { modelId: number | null; source: 'assignment' | 'rotation' | 'none' };

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Monday (local) of the week containing `date`. */
function weekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** ISO of the period start: Monday (weekly) or 1st of the month (monthly). */
export function periodStartIso(date: Date, period: RotationPeriod): string {
  if (period === 'monthly') return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-01`;
  return toIso(weekStart(date));
}

/** Whole periods between two dates (date − anchor), can be negative. */
export function periodsBetween(anchorIso: string, date: Date, period: RotationPeriod): number {
  const anchor = parseIso(anchorIso);
  if (period === 'monthly') {
    return (date.getFullYear() - anchor.getFullYear()) * 12 + (date.getMonth() - anchor.getMonth());
  }
  const a = weekStart(anchor).getTime();
  const b = weekStart(date).getTime();
  return Math.floor((b - a) / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Resolves the model for a date. Explicit assignment for the period wins; else the
 * rotation loop (index = periodsSinceAnchor mod n); else none.
 */
export function resolveModelForDate(date: Date, cfg: SchedulingConfig): Resolution {
  const period = cfg.rotation?.period ?? 'weekly';
  const ps = periodStartIso(date, period);

  const assignment = cfg.assignments.find((a) => a.periodStart === ps);
  if (assignment) return { modelId: assignment.modelId, source: 'assignment' };

  if (cfg.rotation?.enabled && cfg.items.length > 0) {
    const items = [...cfg.items].sort((a, b) => a.position - b.position);
    const n = items.length;
    const raw = periodsBetween(cfg.rotation.anchorDate, date, period);
    const idx = ((raw % n) + n) % n;
    return { modelId: items[idx].modelId, source: 'rotation' };
  }

  return { modelId: null, source: 'none' };
}
