import { and, asc, desc, eq, max } from 'drizzle-orm';
import { db } from '@/db/client';
import { exerciseLogs, exercises, trainingDays } from '@/db/schema';
import type { Exercise, ExerciseLog, TrainingDay } from '@/db/schema';

export type TrainingWithExercises = { day: TrainingDay; exercises: Exercise[] };

export function getTrainingDays(): TrainingDay[] {
  return db.select().from(trainingDays).where(eq(trainingDays.deleted, 0)).orderBy(asc(trainingDays.id)).all();
}

export function getTrainingDayById(id: number): TrainingDay | undefined {
  return db.select().from(trainingDays).where(and(eq(trainingDays.id, id), eq(trainingDays.deleted, 0))).get();
}

export function getExercisesForDay(trainingDayId: number): Exercise[] {
  return db
    .select()
    .from(exercises)
    .where(and(eq(exercises.trainingDayId, trainingDayId), eq(exercises.deleted, 0)))
    .orderBy(asc(exercises.sortOrder))
    .all();
}

export function getExerciseById(id: number): Exercise | undefined {
  return db.select().from(exercises).where(and(eq(exercises.id, id), eq(exercises.deleted, 0))).get();
}

// ─── CRUD: training days ───────────────────────────────────────────────────────

export type TrainingDayInput = { label: string; weekday: string };

export function createTrainingDay(input: TrainingDayInput): number {
  const row = db
    .insert(trainingDays)
    .values({ label: input.label.trim(), weekday: input.weekday.trim() })
    .returning({ id: trainingDays.id })
    .get();
  return row!.id;
}

export function updateTrainingDay(id: number, input: TrainingDayInput): void {
  db.update(trainingDays)
    .set({ label: input.label.trim(), weekday: input.weekday.trim() })
    .where(eq(trainingDays.id, id))
    .run();
}

/** Soft-deletes a training day and its exercises. */
export function deleteTrainingDay(id: number): void {
  db.transaction((tx) => {
    tx.update(exercises).set({ deleted: 1 }).where(eq(exercises.trainingDayId, id)).run();
    tx.update(trainingDays).set({ deleted: 1 }).where(eq(trainingDays.id, id)).run();
  });
}

// ─── CRUD: exercises ───────────────────────────────────────────────────────────

export type ExerciseInput = {
  trainingDayId: number;
  name: string;
  type: string | null;
  sets: string | null;
  reps: string | null;
  rest: string | null;
  ladder: string | null;
  note: string | null;
};

function nextExerciseSort(trainingDayId: number): number {
  const row = db
    .select({ value: max(exercises.sortOrder) })
    .from(exercises)
    .where(and(eq(exercises.trainingDayId, trainingDayId), eq(exercises.deleted, 0)))
    .get();
  return (row?.value ?? -1) + 1;
}

export function createExercise(input: ExerciseInput): number {
  const row = db
    .insert(exercises)
    .values({
      trainingDayId: input.trainingDayId,
      name: input.name.trim(),
      type: input.type?.trim() || null,
      sets: input.sets?.trim() || null,
      reps: input.reps?.trim() || null,
      rest: input.rest?.trim() || null,
      ladder: input.ladder?.trim() || null,
      note: input.note?.trim() || null,
      sortOrder: nextExerciseSort(input.trainingDayId),
    })
    .returning({ id: exercises.id })
    .get();
  return row!.id;
}

export function updateExercise(id: number, input: ExerciseInput): void {
  db.update(exercises)
    .set({
      name: input.name.trim(),
      type: input.type?.trim() || null,
      sets: input.sets?.trim() || null,
      reps: input.reps?.trim() || null,
      rest: input.rest?.trim() || null,
      ladder: input.ladder?.trim() || null,
      note: input.note?.trim() || null,
    })
    .where(eq(exercises.id, id))
    .run();
}

export function deleteExercise(id: number): void {
  db.update(exercises).set({ deleted: 1 }).where(eq(exercises.id, id)).run();
}

/** Rewrites sort_order to match the given id order (0..n). */
export function reorderExercises(orderedIds: number[]): void {
  db.transaction((tx) => {
    orderedIds.forEach((id, index) => {
      tx.update(exercises).set({ sortOrder: index }).where(eq(exercises.id, id)).run();
    });
  });
}

export function getAllTrainingWithExercises(): TrainingWithExercises[] {
  return getTrainingDays().map((day) => ({ day, exercises: getExercisesForDay(day.id) }));
}

/** Logs (or updates) a single set for an exercise on a date. */
export function logSet(
  exerciseId: number,
  date: string,
  setNumber: number,
  values: { reps?: number | null; holdSeconds?: number | null; note?: string | null },
): void {
  const existing = db
    .select({ id: exerciseLogs.id })
    .from(exerciseLogs)
    .where(
      and(
        eq(exerciseLogs.exerciseId, exerciseId),
        eq(exerciseLogs.date, date),
        eq(exerciseLogs.setNumber, setNumber),
      ),
    )
    .get();
  const loggedAt = new Date().toISOString();
  const data = {
    reps: values.reps ?? null,
    holdSeconds: values.holdSeconds ?? null,
    note: values.note ?? null,
    loggedAt,
  };
  if (existing) {
    db.update(exerciseLogs).set(data).where(eq(exerciseLogs.id, existing.id)).run();
  } else {
    db.insert(exerciseLogs).values({ exerciseId, date, setNumber, ...data }).run();
  }
}

export function getLogsForDate(exerciseId: number, date: string): ExerciseLog[] {
  return db
    .select()
    .from(exerciseLogs)
    .where(and(eq(exerciseLogs.exerciseId, exerciseId), eq(exerciseLogs.date, date), eq(exerciseLogs.deleted, 0)))
    .orderBy(asc(exerciseLogs.setNumber))
    .all();
}

/** Most recent past session for an exercise: its set values for the reference line. */
export function getLastSession(
  exerciseId: number,
  excludeDate?: string,
): { date: string; values: number[] } | null {
  const rows = db
    .select()
    .from(exerciseLogs)
    .where(and(eq(exerciseLogs.exerciseId, exerciseId), eq(exerciseLogs.deleted, 0)))
    .orderBy(desc(exerciseLogs.date), asc(exerciseLogs.setNumber))
    .all();
  if (rows.length === 0) return null;
  const dates = [...new Set(rows.map((r) => r.date))]; // already date-desc
  const target = dates.find((d) => d !== excludeDate) ?? dates[0];
  const values = rows
    .filter((r) => r.date === target)
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((r) => r.reps ?? r.holdSeconds ?? 0);
  return { date: target, values };
}
