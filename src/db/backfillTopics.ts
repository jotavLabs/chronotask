import { and, eq, isNull } from 'drizzle-orm';
import { topicFor } from '@/lib/topics';
import { db } from './client';
import { categories, routineBlocks } from './schema';

/**
 * Backfills `topic` on existing Estudo blocks that don't have one yet.
 * Idempotent — only touches rows where topic IS NULL. Safe to run every boot.
 */
export function backfillTopics(): void {
  const estudo = db.select({ id: categories.id }).from(categories).where(eq(categories.name, 'Estudo')).get();
  if (!estudo) return;
  const rows = db
    .select()
    .from(routineBlocks)
    .where(and(eq(routineBlocks.categoryId, estudo.id), isNull(routineBlocks.topic)))
    .all();
  for (const b of rows) {
    const t = topicFor(b.activity, b.note);
    if (t) db.update(routineBlocks).set({ topic: t }).where(eq(routineBlocks.id, b.id)).run();
  }
}
