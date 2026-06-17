import { and, eq, max } from 'drizzle-orm';
import { db } from '@/db/client';
import { categories, completions, routineBlocks } from '@/db/schema';
import type { RoutineBlock } from '@/db/schema';
import { FREE_CATEGORY_NAMES, placementDuration, repackByOrder } from '@/lib/repack';
import { computeDuration, timeToMinutes } from '@/lib/validation';
import { getEditingModelId } from './modelsRepo';

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
  topic: string | null;
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

export function getBlocksForDay(dayLabel: string, modelId: number = getEditingModelId()): BlockWithCategory[] {
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
      topic: routineBlocks.topic,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(routineBlocks)
    .leftJoin(categories, eq(routineBlocks.categoryId, categories.id))
    .where(and(eq(routineBlocks.modelId, modelId), eq(routineBlocks.dayLabel, dayLabel), eq(routineBlocks.deleted, 0)))
    .orderBy(routineBlocks.sortOrder)
    .all();

  return rows as BlockWithCategory[];
}

export function getBlockById(id: number): RoutineBlock | undefined {
  return db
    .select()
    .from(routineBlocks)
    .where(and(eq(routineBlocks.id, id), eq(routineBlocks.deleted, 0)))
    .get();
}

/** Blocks of a given day filtered by category name (e.g. 'Estudo'). */
export function getBlocksForDayByCategory(
  dayLabel: string,
  categoryName: string,
  modelId: number = getEditingModelId(),
): BlockWithCategory[] {
  return getBlocksForDay(dayLabel, modelId).filter((b) => b.categoryName === categoryName);
}

function nextSortOrder(dayLabel: string, modelId: number): number {
  const row = db
    .select({ value: max(routineBlocks.sortOrder) })
    .from(routineBlocks)
    .where(and(eq(routineBlocks.modelId, modelId), eq(routineBlocks.dayLabel, dayLabel), eq(routineBlocks.deleted, 0)))
    .get();
  return (row?.value ?? -1) + 1;
}

export function createBlock(input: BlockInput): number {
  const durationMin = computeDuration(input.start, input.end) ?? 0;
  const modelId = getEditingModelId();
  const row = db
    .insert(routineBlocks)
    .values({
      modelId,
      dayLabel: input.dayLabel,
      start: input.start,
      end: input.end,
      durationMin,
      activity: input.activity.trim(),
      categoryId: input.categoryId,
      note: input.note?.trim() || null,
      sortOrder: nextSortOrder(input.dayLabel, modelId),
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
    tx.update(completions)
      .set({ deleted: 1 })
      .where(and(eq(completions.refType, 'block'), eq(completions.refId, id)))
      .run();
    tx.update(routineBlocks).set({ deleted: 1 }).where(eq(routineBlocks.id, id)).run();
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

/**
 * Applies a drag-reorder: stores the new order and recomputes each block's times
 * (pure repack — rigids keep duration, free time absorbs slack, Sono pinned, no gaps).
 */
export function applyReorder(dayLabel: string, orderedIds: number[], modelId: number = getEditingModelId()): void {
  const byId = new Map(getBlocksForDay(dayLabel, modelId).map((b) => [b.id, b]));
  const input = orderedIds
    .map((id) => byId.get(id))
    .filter((b): b is NonNullable<typeof b> => b != null)
    .map((b) => ({
      id: b.id,
      durationMin: b.durationMin,
      startMin: timeToMinutes(b.start) ?? 0,
      free: b.categoryName != null && FREE_CATEGORY_NAMES.includes(b.categoryName),
      sleep: b.categoryName === 'Sono',
    }));
  const placeById = new Map(repackByOrder(input).map((p) => [p.id, p]));

  db.transaction((tx) => {
    orderedIds.forEach((id, index) => {
      const p = placeById.get(id);
      if (!p) return;
      tx.update(routineBlocks)
        .set({ sortOrder: index, start: p.start, end: p.end, durationMin: placementDuration(p.start, p.end) })
        .where(eq(routineBlocks.id, id))
        .run();
    });
  });
}
