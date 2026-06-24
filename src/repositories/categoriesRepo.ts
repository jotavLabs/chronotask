import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { categories, events, holidays, monthlyRoutines, routineBlocks } from '@/db/schema';
import type { Category } from '@/db/schema';

export function getAllCategories() {
  return db.select().from(categories).where(eq(categories.deleted, 0)).all();
}

export function buildCategoryMap(): Map<number, typeof categories.$inferSelect> {
  const all = getAllCategories();
  return new Map(all.map((c) => [c.id, c]));
}

export type CategoryInput = {
  name: string;
  cutOrder: number | null;
  protected: number;
  tieGroup: string | null;
  color: string | null;
  skipOnHoliday: number;
  fixedTime: number;
};

export function createCategory(input: CategoryInput): number {
  const row = db
    .insert(categories)
    .values({
      name: input.name.trim(),
      cutOrder: input.protected === 1 ? null : input.cutOrder,
      protected: input.protected,
      tieGroup: input.tieGroup?.trim() || null,
      color: input.color,
      skipOnHoliday: input.skipOnHoliday,
      fixedTime: input.fixedTime,
    })
    .returning({ id: categories.id })
    .get();
  return row!.id;
}

export function updateCategory(id: number, input: CategoryInput): void {
  db
    .update(categories)
    .set({
      name: input.name.trim(),
      cutOrder: input.protected === 1 ? null : input.cutOrder,
      protected: input.protected,
      tieGroup: input.tieGroup?.trim() || null,
      color: input.color,
      skipOnHoliday: input.skipOnHoliday,
      fixedTime: input.fixedTime,
    })
    .where(eq(categories.id, id))
    .run();
}

export function deleteCategory(id: number): void {
  db.update(categories).set({ deleted: 1 }).where(eq(categories.id, id)).run();
}

/** Returns the id of an active category by name, creating a plain one if absent. */
export function getOrCreateCategoryByName(name: string): number {
  const existing = db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.name, name), eq(categories.deleted, 0)))
    .get();
  if (existing) return existing.id;
  return createCategory({ name, cutOrder: null, protected: 0, tieGroup: null, color: null, skipOnHoliday: 0, fixedTime: 0 });
}

/** How many blocks/events/monthly routines reference this category. */
export function countCategoryUsage(id: number): number {
  const b = db.select({ id: routineBlocks.id }).from(routineBlocks).where(and(eq(routineBlocks.categoryId, id), eq(routineBlocks.deleted, 0))).all().length;
  const e = db.select({ id: events.id }).from(events).where(and(eq(events.categoryId, id), eq(events.deleted, 0))).all().length;
  const m = db.select({ id: monthlyRoutines.id }).from(monthlyRoutines).where(and(eq(monthlyRoutines.categoryId, id), eq(monthlyRoutines.deleted, 0))).all().length;
  return b + e + m;
}

/** A category is cuttable when it's not protected and has a cut order. */
export function isCuttable(c: Pick<Category, 'protected' | 'cutOrder'>): boolean {
  return c.protected !== 1 && c.cutOrder != null;
}

/** Returns a Set<isoDate> of all holiday dates for use in pure day resolution. */
export function buildHolidayDateSet(): Set<string> {
  const rows = db.select({ date: holidays.date }).from(holidays).where(eq(holidays.deleted, 0)).all();
  return new Set(rows.map((r) => r.date));
}

/** Returns a Map<isoDate, name> for holiday name lookups. */
export function buildHolidayMap(): Map<string, string> {
  const rows = db.select({ date: holidays.date, name: holidays.name }).from(holidays).where(eq(holidays.deleted, 0)).all();
  return new Map(rows.map((r) => [r.date, r.name]));
}

/** All holidays as { date, name }, sorted by date. */
export function getHolidaysList(): { date: string; name: string }[] {
  return db
    .select({ date: holidays.date, name: holidays.name })
    .from(holidays)
    .where(eq(holidays.deleted, 0))
    .orderBy(holidays.date)
    .all();
}
