import { buildBackup, parseBackup, SCHEMA_VERSION } from '../backup';
import type { BackupData } from '../backup';

const DATA: BackupData = {
  settings: [{ key: 'theme_mode', value: 'dark' }],
  categories: [{ id: 1, name: 'Estudo', cutOrder: 2, protected: 0, color: '#10B981' }],
  routine_models: [{ id: 1, name: 'Minha rotina', source: 'manual' }],
  routine_blocks: [{ id: 1, modelId: 1, dayLabel: 'Seg', start: '07:00', end: '08:00', durationMin: 60, activity: 'Estudo', categoryId: 1, topic: 'Inglês' }],
  monthly_routines: [{ id: 1, name: 'Cabelo', windowStartDay: 11, windowEndDay: 17, durationMin: 60 }],
  events: [{ id: 1, date: '2026-06-10', start: '14:00', end: '15:00', title: 'Dentista', durationMin: 60 }],
  holidays: [{ id: 1, date: '2026-12-25', name: 'Natal', type: 'Nacional' }],
  completions: [{ id: 1, date: '2026-06-08', refType: 'block', refId: 1, done: 1, loggedAt: '2026-06-08T10:00:00Z' }],
  training_days: [{ id: 1, label: 'Upper A', weekday: 'Seg' }],
  exercises: [{ id: 1, trainingDayId: 1, name: 'Pull-up', sets: '5', reps: '3-5', sortOrder: 1 }],
  exercise_logs: [{ id: 1, exerciseId: 1, date: '2026-06-08', setNumber: 1, reps: 5, loggedAt: '2026-06-08T14:00:00Z' }],
  rotation: [{ id: 1, enabled: 0, mode: 'loop', period: 'weekly', anchorDate: '2026-06-01' }],
  rotation_items: [{ id: 1, position: 0, modelId: 1 }],
  week_assignments: [{ id: 1, periodStart: '2026-06-08', modelId: 1 }],
};

describe('backup', () => {
  it('buildBackup stamps version and timestamp', () => {
    const f = buildBackup(DATA);
    expect(f.version).toBe(SCHEMA_VERSION);
    expect(typeof f.exportedAt).toBe('string');
    expect(f.data).toBe(DATA);
  });

  it('round-trips: export → JSON → import yields identical data', () => {
    const json = JSON.stringify(buildBackup(DATA));
    const res = parseBackup(json);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.file.data).toEqual(DATA);
  });

  it('rejects malformed JSON', () => {
    const res = parseBackup('{ not json');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/JSON/);
  });

  it('rejects a wrong version', () => {
    const res = parseBackup(JSON.stringify({ version: 999, exportedAt: '', data: DATA }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/versão/i);
  });

  it('rejects a missing table', () => {
    const partial = { ...DATA } as Record<string, unknown>;
    delete partial.exercises;
    const res = parseBackup(JSON.stringify({ version: SCHEMA_VERSION, exportedAt: '', data: partial }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/exercises/);
  });
});
