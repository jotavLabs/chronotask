import { sqlite } from '@/db/client';

/** Domain tables that participate in cloud sync (settings stays device-local). */
export const SYNC_TABLES = [
  'categories',
  'routine_models',
  'routine_blocks',
  'monthly_routines',
  'events',
  'holidays',
  'completions',
  'training_days',
  'exercises',
  'exercise_logs',
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

export type SyncRecord = Record<string, unknown> & {
  id: number;
  updated_at: string | null;
  deleted: number;
};

type Scalar = string | number | null;

const colCache = new Map<string, string[]>();
function localColumns(table: SyncTable): string[] {
  const cached = colCache.get(table);
  if (cached) return cached;
  const info = sqlite.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
  const cols = info.map((c) => c.name);
  colCache.set(table, cols);
  return cols;
}

/** Local rows whose updated_at advanced past the cursor (null cursor = every touched row). */
export function getChangesSince(table: SyncTable, sinceIso: string | null): SyncRecord[] {
  if (sinceIso) {
    return sqlite.getAllSync<SyncRecord>(
      `SELECT * FROM ${table} WHERE updated_at IS NOT NULL AND updated_at > ?`,
      sinceIso,
    );
  }
  return sqlite.getAllSync<SyncRecord>(`SELECT * FROM ${table} WHERE updated_at IS NOT NULL`);
}

/**
 * Upserts remote rows locally, keeping their explicit updated_at. The maintenance
 * triggers only fire when updated_at is unchanged/null, so a synced timestamp is
 * preserved and never bumped to "now". Remote-only columns (e.g. user_id) are dropped.
 */
export function applyRemoteChanges(table: SyncTable, rows: SyncRecord[]): void {
  if (rows.length === 0) return;
  const allowed = new Set(localColumns(table));
  for (const row of rows) {
    const cols = Object.keys(row).filter((c) => allowed.has(c));
    if (cols.length === 0) continue;
    const placeholders = cols.map(() => '?').join(', ');
    const updates = cols
      .filter((c) => c !== 'id')
      .map((c) => `${c} = excluded.${c}`)
      .join(', ');
    const sql =
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ` +
      `ON CONFLICT(id) DO UPDATE SET ${updates}`;
    const values = cols.map((c) => normalize(row[c]));
    sqlite.runSync(sql, ...values);
  }
}

function normalize(v: unknown): Scalar {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === undefined) return null;
  return v as Scalar;
}

// ─── cursor & account markers (sync_state) ────────────────────────────────────

function getState(key: string): string | null {
  const row = sqlite.getFirstSync<{ value: string }>(`SELECT value FROM sync_state WHERE key = ?`, key);
  return row?.value ?? null;
}
function setState(key: string, value: string): void {
  sqlite.runSync(
    `INSERT INTO sync_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}
function delState(key: string): void {
  sqlite.runSync(`DELETE FROM sync_state WHERE key = ?`, key);
}

export const getCursor = (): string | null => getState('last_pulled_at');
export const setCursor = (iso: string): void => setState('last_pulled_at', iso);
export const getSyncUserId = (): string | null => getState('user_id');
export const setSyncUserId = (id: string): void => setState('user_id', id);
export const getLastSyncAt = (): string | null => getState('last_sync_at');
export const setLastSyncAt = (iso: string): void => setState('last_sync_at', iso);

/** Clears sync cursor/account markers. Local domain data is intentionally kept. */
export function clearSyncState(): void {
  delState('last_pulled_at');
  delState('user_id');
  delState('last_sync_at');
}
