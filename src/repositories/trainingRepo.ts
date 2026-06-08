import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { exerciseLogs, exercises, trainingDays } from '@/db/schema';
import type { Exercise, ExerciseLog, TrainingDay } from '@/db/schema';

export type TrainingWithExercises = { day: TrainingDay; exercises: Exercise[] };

export function getTrainingDays(): TrainingDay[] {
  return db.select().from(trainingDays).orderBy(asc(trainingDays.id)).all();
}

export function getExercisesForDay(trainingDayId: number): Exercise[] {
  return db
    .select()
    .from(exercises)
    .where(eq(exercises.trainingDayId, trainingDayId))
    .orderBy(asc(exercises.sortOrder))
    .all();
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
    .where(and(eq(exerciseLogs.exerciseId, exerciseId), eq(exerciseLogs.date, date)))
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
    .where(eq(exerciseLogs.exerciseId, exerciseId))
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
