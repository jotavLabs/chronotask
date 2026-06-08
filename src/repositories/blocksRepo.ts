import { and, eq, max } from 'drizzle-orm';
import { db } from '@/db/client';
import { categories, completions, routineBlocks } from '@/db/schema';
import type { RoutineBlock } from '@/db/schema';
import { computeDuration } from '@/lib/validation';

export type BlockWithCategory = {
  id: number;
  dayLabel: string;
  start: string;
  end: string;
  durationMin: number;
  activity: string;
  categoryId: number | null;
  note: string | null;
  sortOrder: number;
  categoryName: string | null;
  categoryColor: string | null;
};

/** Input from the block form (duration and sort order are derived here). */
export type BlockInput = {
  dayLabel: string;
  start: string;
  end: string;
  activity: string;
  categoryId: number | null;
  note?: string | null;
};

export function getBlocksForDay(dayLabel: string): BlockWithCategory[] {
  const rows = db
    .select({
      id: routineBlocks.id,
      dayLabel: routineBlocks.dayLabel,
      start: routineBlocks.start,
      end: routineBlocks.end,
      durationMin: routineBlocks.durationMin,
      activity: routineBlocks.activity,
      categoryId: routineBlocks.categoryId,
      note: routineBlocks.note,
      sortOrder: routineBlocks.sortOrder,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(routineBlocks)
    .leftJoin(categories, eq(routineBlocks.categoryId, categories.id))
    .where(eq(routineBlocks.dayLabel, dayLabel))
    .orderBy(routineBlocks.sortOrder)
    .all();

  return rows as BlockWithCategory[];
}

export function getBlockById(id: number): RoutineBlock | undefined {
  return db.select().from(routineBlocks).where(eq(routineBlocks.id, id)).get();
}

/** Blocks of a given day filtered by category name (e.g. 'Estudo'). */
export function getBlocksForDayByCategory(dayLabel: string, categoryName: string): BlockWithCategory[] {
  return getBlocksForDay(dayLabel).filter((b) => b.categoryName === categoryName);
}

function nextSortOrder(dayLabel: string): number {
  const row = db
    .select({ value: max(routineBlocks.sortOrder) })
    .from(routineBlocks)
    .where(eq(routineBlocks.dayLabel, dayLabel))
    .get();
  return (row?.value ?? -1) + 1;
}

export function createBlock(input: BlockInput): number {
  const durationMin = computeDuration(input.start, input.end) ?? 0;
  const row = db
    .insert(routineBlocks)
    .values({
      dayLabel: input.dayLabel,
      start: input.start,
      end: input.end,
      durationMin,
      activity: input.activity.trim(),
      categoryId: input.categoryId,
      note: input.note?.trim() || null,
      sortOrder: nextSortOrder(input.dayLabel),
    })
    .returning({ id: routineBlocks.id })
    .get();
  return row!.id;
}

export function updateBlock(id: number, input: BlockInput): void {
  const durationMin = computeDuration(input.start, input.end) ?? 0;
  db
    .update(routineBlocks)
    .set({
      dayLabel: input.dayLabel,
      start: input.start,
      end: input.end,
      durationMin,
      activity: input.activity.trim(),
      categoryId: input.categoryId,
      note: input.note?.trim() || null,
    })
    .where(eq(routineBlocks.id, id))
    .run();
}

/**
 * Deletes a block and its orphan completions (ref_type='block', ref_id=id).
 * Documented behavior: completion history for a removed block is discarded.
 */
export function deleteBlock(id: number): void {
  db.transaction((tx) => {
    tx.delete(completions)
      .where(and(eq(completions.refType, 'block'), eq(completions.refId, id)))
      .run();
    tx.delete(routineBlocks).where(eq(routineBlocks.id, id)).run();
  });
}

/** Rewrites sort_order to match the given id order (0..n). */
export function reorderBlocks(orderedIds: number[]): void {
  db.transaction((tx) => {
    orderedIds.forEach((id, index) => {
      tx.update(routineBlocks)
        .set({ sortOrder: index })
        .where(eq(routineBlocks.id, id))
        .run();
    });
  });
}

/** Moves a block up/down within its day, persisting the new sort_order. */
export function moveBlock(dayLabel: string, id: number, direction: 'up' | 'down'): void {
  const ordered = getBlocksForDay(dayLabel).map((b) => b.id);
  const index = ordered.indexOf(id);
  if (index === -1) return;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= ordered.length) return;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  reorderBlocks(ordered);
}
