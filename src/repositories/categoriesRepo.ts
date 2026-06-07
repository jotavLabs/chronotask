import { db } from '@/db/client';
import { categories, holidays } from '@/db/schema';

export function getAllCategories() {
  return db.select().from(categories).all();
}

export function buildCategoryMap(): Map<number, typeof categories.$inferSelect> {
  const all = getAllCategories();
  return new Map(all.map((c) => [c.id, c]));
}

/** Returns a Set<isoDate> of all holiday dates for use in pure day resolution. */
export function buildHolidayDateSet(): Set<string> {
  const rows = db.select({ date: holidays.date }).from(holidays).all();
  return new Set(rows.map((r) => r.date));
}

/** Returns a Map<isoDate, name> for holiday name lookups. */
export function buildHolidayMap(): Map<string, string> {
  const rows = db.select({ date: holidays.date, name: holidays.name }).from(holidays).all();
  return new Map(rows.map((r) => [r.date, r.name]));
}
