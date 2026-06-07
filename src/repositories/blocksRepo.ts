import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { categories, routineBlocks } from '@/db/schema';

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
