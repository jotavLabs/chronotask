import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { categories, monthlyRoutines } from '@/db/schema';
import type { MonthlyRoutine } from '@/db/schema';

export type MonthlyWithCategory = MonthlyRoutine & {
  categoryName: string | null;
  categoryColor: string | null;
};

export type MonthlyInput = {
  name: string;
  windowStartDay: number;
  windowEndDay: number;
  durationMin: number;
  categoryId: number | null;
  suggestedBlock?: string | null;
};

export function getAllMonthly(): MonthlyWithCategory[] {
  const rows = db
    .select({
      id: monthlyRoutines.id,
      name: monthlyRoutines.name,
      windowStartDay: monthlyRoutines.windowStartDay,
      windowEndDay: monthlyRoutines.windowEndDay,
      durationMin: monthlyRoutines.durationMin,
      scheduledDate: monthlyRoutines.scheduledDate,
      lastDone: monthlyRoutines.lastDone,
      suggestedBlock: monthlyRoutines.suggestedBlock,
      categoryId: monthlyRoutines.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(monthlyRoutines)
    .leftJoin(categories, eq(monthlyRoutines.categoryId, categories.id))
    .where(eq(monthlyRoutines.deleted, 0))
    .orderBy(monthlyRoutines.windowStartDay)
    .all();
  return rows as MonthlyWithCategory[];
}

export function getMonthlyById(id: number): MonthlyRoutine | undefined {
  return db.select().from(monthlyRoutines).where(and(eq(monthlyRoutines.id, id), eq(monthlyRoutines.deleted, 0))).get();
}

export function createMonthly(input: MonthlyInput): number {
  const row = db
    .insert(monthlyRoutines)
    .values({
      name: input.name.trim(),
      windowStartDay: input.windowStartDay,
      windowEndDay: input.windowEndDay,
      durationMin: input.durationMin,
      categoryId: input.categoryId,
      suggestedBlock: input.suggestedBlock?.trim() || null,
    })
    .returning({ id: monthlyRoutines.id })
    .get();
  return row!.id;
}

export function updateMonthly(id: number, input: MonthlyInput): void {
  db
    .update(monthlyRoutines)
    .set({
      name: input.name.trim(),
      windowStartDay: input.windowStartDay,
      windowEndDay: input.windowEndDay,
      durationMin: input.durationMin,
      categoryId: input.categoryId,
      suggestedBlock: input.suggestedBlock?.trim() || null,
    })
    .where(eq(monthlyRoutines.id, id))
    .run();
}

export function deleteMonthly(id: number): void {
  db.update(monthlyRoutines).set({ deleted: 1 }).where(eq(monthlyRoutines.id, id)).run();
}

/** Schedules the routine for a specific ISO date this month. */
export function scheduleMonthly(id: number, isoDate: string): void {
  db.update(monthlyRoutines).set({ scheduledDate: isoDate }).where(eq(monthlyRoutines.id, id)).run();
}

/** Marks done: records last_done and clears any pending schedule. */
export function markMonthlyDone(id: number, isoDate: string): void {
  db
    .update(monthlyRoutines)
    .set({ lastDone: isoDate, scheduledDate: null })
    .where(eq(monthlyRoutines.id, id))
    .run();
}
