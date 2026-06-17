import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { weekAssignments } from '@/db/schema';
import type { WeekAssignment } from '@/db/schema';

export function getAssignments(): WeekAssignment[] {
  return db.select().from(weekAssignments).where(eq(weekAssignments.deleted, 0)).all();
}

/** Upserts the model assigned to a period (Monday ISO for weekly, 1st-of-month for monthly). */
export function setAssignment(periodStart: string, modelId: number): void {
  const existing = db
    .select({ id: weekAssignments.id })
    .from(weekAssignments)
    .where(and(eq(weekAssignments.periodStart, periodStart), eq(weekAssignments.deleted, 0)))
    .get();
  if (existing) db.update(weekAssignments).set({ modelId }).where(eq(weekAssignments.id, existing.id)).run();
  else db.insert(weekAssignments).values({ periodStart, modelId }).run();
}

export function clearAssignment(periodStart: string): void {
  db.update(weekAssignments).set({ deleted: 1 }).where(eq(weekAssignments.periodStart, periodStart)).run();
}
