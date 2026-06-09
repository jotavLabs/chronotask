import { and, asc, eq, gte, isNotNull, lte } from 'drizzle-orm';
import { db } from '@/db/client';
import { categories, completions, exerciseLogs, exercises, routineBlocks } from '@/db/schema';
import { resolveDayLabel, toIsoDate } from '@/lib/dayResolver';
import { TRACKABLE_CATEGORIES } from '@/lib/stats';
import type { CompletedBlock } from '@/lib/stats';

/** Completed (done=1) routine blocks in [startIso, endIso], with topic/category. */
export function getCompletedBlocks(startIso: string, endIso: string): CompletedBlock[] {
  const rows = db
    .select({
      date: completions.date,
      topic: routineBlocks.topic,
      category: categories.name,
      durationMin: routineBlocks.durationMin,
    })
    .from(completions)
    .innerJoin(routineBlocks, eq(completions.refId, routineBlocks.id))
    .leftJoin(categories, eq(routineBlocks.categoryId, categories.id))
    .where(
      and(
        eq(completions.refType, 'block'),
        eq(completions.done, 1),
        gte(completions.date, startIso),
        lte(completions.date, endIso),
      ),
    )
    .all();
  return rows as CompletedBlock[];
}

/** How many times each topic/category was scheduled across the date range. */
export function getScheduledCounts(
  startDate: Date,
  endDate: Date,
  holidaySet: Set<string>,
): { topic: Record<string, number>; category: Record<string, number> } {
  const all = db
    .select({
      dayLabel: routineBlocks.dayLabel,
      topic: routineBlocks.topic,
      category: categories.name,
    })
    .from(routineBlocks)
    .leftJoin(categories, eq(routineBlocks.categoryId, categories.id))
    .all();

  const byDay = new Map<string, typeof all>();
  for (const b of all) {
    const list = byDay.get(b.dayLabel) ?? [];
    list.push(b);
    byDay.set(b.dayLabel, list);
  }

  const topic: Record<string, number> = {};
  const category: Record<string, number> = {};
  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    const label = resolveDayLabel(cur, holidaySet);
    for (const b of byDay.get(label) ?? []) {
      if (b.topic) topic[b.topic] = (topic[b.topic] ?? 0) + 1;
      else if (b.category && TRACKABLE_CATEGORIES.includes(b.category)) {
        category[b.category] = (category[b.category] ?? 0) + 1;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  return { topic, category };
}

/** Exercise rep logs in [startIso, endIso] for training volume. */
export function getExerciseRepsRange(startIso: string, endIso: string): { exercise: string; reps: number }[] {
  const rows = db
    .select({ exercise: exercises.name, reps: exerciseLogs.reps })
    .from(exerciseLogs)
    .innerJoin(exercises, eq(exerciseLogs.exerciseId, exercises.id))
    .where(
      and(
        isNotNull(exerciseLogs.reps),
        gte(exerciseLogs.date, startIso),
        lte(exerciseLogs.date, endIso),
      ),
    )
    .orderBy(asc(exerciseLogs.date))
    .all();
  return rows.map((r) => ({ exercise: r.exercise, reps: r.reps ?? 0 }));
}
