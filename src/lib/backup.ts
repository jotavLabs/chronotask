// Pure backup (de)serialization. The service handles files/sharing/picker.

export const SCHEMA_VERSION = 7; // current migration idx (m0007: categories.fixed_time)

export type BackupData = {
  settings: unknown[];
  categories: unknown[];
  routine_models: unknown[];
  routine_blocks: unknown[];
  monthly_routines: unknown[];
  events: unknown[];
  holidays: unknown[];
  completions: unknown[];
  training_days: unknown[];
  exercises: unknown[];
  exercise_logs: unknown[];
  rotation: unknown[];
  rotation_items: unknown[];
  week_assignments: unknown[];
};

export type BackupFile = { version: number; exportedAt: string; data: BackupData };

export const TABLE_KEYS: (keyof BackupData)[] = [
  'settings', 'categories', 'routine_models', 'routine_blocks', 'monthly_routines', 'events',
  'holidays', 'completions', 'training_days', 'exercises', 'exercise_logs',
  'rotation', 'rotation_items', 'week_assignments',
];

export function buildBackup(data: BackupData): BackupFile {
  return { version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data };
}

export type ParseResult = { ok: true; file: BackupFile } | { ok: false; error: string };

export function parseBackup(json: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Arquivo inválido: não é um JSON válido.' };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'Estrutura de backup inválida.' };
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.version !== 'number') return { ok: false, error: 'Versão do backup ausente.' };
  if (obj.version !== SCHEMA_VERSION) {
    return { ok: false, error: `Backup é da versão ${obj.version}; este app usa a ${SCHEMA_VERSION}.` };
  }
  if (typeof obj.data !== 'object' || obj.data === null) {
    return { ok: false, error: 'Backup sem dados.' };
  }
  const data = obj.data as Record<string, unknown>;
  for (const key of TABLE_KEYS) {
    if (!Array.isArray(data[key])) return { ok: false, error: `Tabela "${key}" ausente ou corrompida.` };
  }
  return {
    ok: true,
    file: { version: obj.version, exportedAt: String(obj.exportedAt ?? ''), data: data as unknown as BackupData },
  };
}
