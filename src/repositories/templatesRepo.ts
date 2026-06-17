import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { completions, exerciseLogs, exercises, monthlyRoutines, routineBlocks, trainingDays } from '@/db/schema';
import { getTemplate } from '@/lib/templates';
import { getOrCreateCategoryByName } from './categoriesRepo';
import { getEditingModelId } from './modelsRepo';

/**
 * Wipes routine/training/study content (blocks, monthly routines, training days,
 * exercises, logs, completions). Keeps categories, holidays and settings. Used by
 * "Limpar dados de exemplo" so the user starts clean without touching their setup.
 */
export function clearExampleData(): void {
  db.transaction((tx) => {
    tx.delete(exerciseLogs).run();
    tx.delete(exercises).run();
    tx.delete(trainingDays).run();
    tx.delete(completions).run();
    tx.delete(monthlyRoutines).run();
    tx.delete(routineBlocks).run();
  });
}

/**
 * Applies a routine template's blocks. With `replace`, the current routine is
 * soft-deleted first (used by "redefinir ponto de partida"); otherwise it just
 * inserts (onboarding on an empty routine). Category names are resolved/created up
 * front, then blocks are inserted in a single transaction.
 */
export function applyTemplate(templateId: string, opts: { replace: boolean; modelId?: number }): void {
  const tpl = getTemplate(templateId);
  if (!tpl) return;
  const modelId = opts.modelId ?? getEditingModelId();

  const catIdByName = new Map<string, number>();
  for (const b of tpl.blocks) {
    if (!catIdByName.has(b.catName)) catIdByName.set(b.catName, getOrCreateCategoryByName(b.catName));
  }

  db.transaction((tx) => {
    if (opts.replace) {
      tx.update(routineBlocks).set({ deleted: 1 }).where(eq(routineBlocks.modelId, modelId)).run();
    }
    const rows = tpl.blocks.map((b) => ({
      modelId,
      dayLabel: b.dayLabel,
      start: b.start,
      end: b.end,
      durationMin: b.durationMin,
      activity: b.activity,
      categoryId: catIdByName.get(b.catName) ?? null,
      note: null,
      sortOrder: b.sortOrder,
    }));
    for (let i = 0; i < rows.length; i += 50) {
      tx.insert(routineBlocks).values(rows.slice(i, i + 50)).run();
    }
  });
}
