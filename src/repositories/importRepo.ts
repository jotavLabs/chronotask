import { db } from '@/db/client';
import { routineBlocks } from '@/db/schema';
import type { ImportedBlock } from '@/lib/routineImport';
import { getOrCreateCategoryByName } from './categoriesRepo';
import { createModel } from './modelsRepo';

/** Creates a new model (source=import) from normalized blocks. Returns the model id. */
export function createImportedModel(name: string, blocks: ImportedBlock[]): number {
  const modelId = createModel(name, 'import');
  const catId = new Map<string, number>();
  for (const b of blocks) {
    if (!catId.has(b.catName)) catId.set(b.catName, getOrCreateCategoryByName(b.catName));
  }
  const sortByDay = new Map<string, number>();
  const rows = blocks.map((b) => {
    const n = sortByDay.get(b.dayLabel) ?? 0;
    sortByDay.set(b.dayLabel, n + 1);
    return {
      modelId,
      dayLabel: b.dayLabel,
      start: b.start,
      end: b.end,
      durationMin: b.durationMin,
      activity: b.activity,
      categoryId: catId.get(b.catName) ?? null,
      note: null,
      sortOrder: n,
    };
  });
  db.transaction((tx) => {
    for (let i = 0; i < rows.length; i += 50) tx.insert(routineBlocks).values(rows.slice(i, i + 50)).run();
  });
  return modelId;
}
