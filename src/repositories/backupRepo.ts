import { db } from '@/db/client';
import {
  categories,
  completions,
  events,
  exerciseLogs,
  exercises,
  holidays,
  monthlyRoutines,
  routineBlocks,
  routineModels,
  settings,
  trainingDays,
} from '@/db/schema';
import type { BackupData } from '@/lib/backup';

/** Reads every table for export. Keys match the backup format. */
export function getAllData(): BackupData {
  return {
    settings: db.select().from(settings).all(),
    categories: db.select().from(categories).all(),
    routine_models: db.select().from(routineModels).all(),
    routine_blocks: db.select().from(routineBlocks).all(),
    monthly_routines: db.select().from(monthlyRoutines).all(),
    events: db.select().from(events).all(),
    holidays: db.select().from(holidays).all(),
    completions: db.select().from(completions).all(),
    training_days: db.select().from(trainingDays).all(),
    exercises: db.select().from(exercises).all(),
    exercise_logs: db.select().from(exerciseLogs).all(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function insertAll(tx: any, table: any, rows: unknown[]): void {
  if (!rows || rows.length === 0) return;
  for (let i = 0; i < rows.length; i += 50) {
    tx.insert(table).values(rows.slice(i, i + 50)).run();
  }
}

/** Replaces all data with the backup, atomically (all-or-nothing). */
export function restoreData(data: BackupData): void {
  db.transaction((tx) => {
    // delete children first (respect FKs)
    tx.delete(exerciseLogs).run();
    tx.delete(exercises).run();
    tx.delete(completions).run();
    tx.delete(events).run();
    tx.delete(monthlyRoutines).run();
    tx.delete(routineBlocks).run();
    tx.delete(routineModels).run();
    tx.delete(holidays).run();
    tx.delete(trainingDays).run();
    tx.delete(categories).run();
    tx.delete(settings).run();

    // insert parents first
    insertAll(tx, categories, data.categories);
    insertAll(tx, routineModels, data.routine_models);
    insertAll(tx, trainingDays, data.training_days);
    insertAll(tx, routineBlocks, data.routine_blocks);
    insertAll(tx, monthlyRoutines, data.monthly_routines);
    insertAll(tx, events, data.events);
    insertAll(tx, holidays, data.holidays);
    insertAll(tx, completions, data.completions);
    insertAll(tx, exercises, data.exercises);
    insertAll(tx, exerciseLogs, data.exercise_logs);
    insertAll(tx, settings, data.settings);
  });
}
