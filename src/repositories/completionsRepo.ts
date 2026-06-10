import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { completions } from '@/db/schema';
import { toIsoDate } from '@/lib/dayResolver';

export type CompletionKey = { date: string; refType: string; refId: number };

export function getCompletionsForDate(date: string) {
  return db.select().from(completions).where(and(eq(completions.date, date), eq(completions.deleted, 0))).all();
}

export function isBlockDone(date: string, blockId: number): boolean {
  const row = db
    .select({ done: completions.done })
    .from(completions)
    .where(
      and(
        eq(completions.date, date),
        eq(completions.refType, 'block'),
        eq(completions.refId, blockId),
        eq(completions.deleted, 0),
      ),
    )
    .get();
  return (row?.done ?? 0) === 1;
}

export function setBlockDone(date: string, blockId: number, done: boolean): void {
  const existing = db
    .select({ id: completions.id })
    .from(completions)
    .where(
      and(
        eq(completions.date, date),
        eq(completions.refType, 'block'),
        eq(completions.refId, blockId),
      ),
    )
    .get();

  if (existing) {
    db.update(completions)
      .set({ done: done ? 1 : 0, loggedAt: new Date().toISOString() })
      .where(eq(completions.id, existing.id))
      .run();
  } else {
    db.insert(completions)
      .values({
        date,
        refType: 'block',
        refId: blockId,
        done: done ? 1 : 0,
        loggedAt: new Date().toISOString(),
      })
      .run();
  }
}

export function getBlockNote(date: string, blockId: number): string | null {
  const row = db
    .select({ note: completions.valueNote })
    .from(completions)
    .where(
      and(eq(completions.date, date), eq(completions.refType, 'block'), eq(completions.refId, blockId), eq(completions.deleted, 0)),
    )
    .get();
  return row?.note ?? null;
}

/** Saves a session note in the same completion row (date + block), keeping `done`. */
export function setBlockNote(date: string, blockId: number, note: string): void {
  const value = note.trim() || null;
  const existing = db
    .select({ id: completions.id })
    .from(completions)
    .where(
      and(eq(completions.date, date), eq(completions.refType, 'block'), eq(completions.refId, blockId)),
    )
    .get();

  if (existing) {
    db.update(completions)
      .set({ valueNote: value, loggedAt: new Date().toISOString() })
      .where(eq(completions.id, existing.id))
      .run();
  } else {
    db.insert(completions)
      .values({
        date,
        refType: 'block',
        refId: blockId,
        done: 0,
        valueNote: value,
        loggedAt: new Date().toISOString(),
      })
      .run();
  }
}

/** Returns a Set<blockId> of completed block IDs for a given date. */
export function getDoneBlockIds(date: string): Set<number> {
  const rows = db
    .select({ refId: completions.refId })
    .from(completions)
    .where(
      and(eq(completions.date, date), eq(completions.refType, 'block'), eq(completions.done, 1), eq(completions.deleted, 0)),
    )
    .all();
  return new Set(rows.map((r) => r.refId));
}
