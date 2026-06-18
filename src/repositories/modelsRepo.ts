import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { rotationItems, routineBlocks, routineModels, weekAssignments } from '@/db/schema';
import type { RoutineModel } from '@/db/schema';
import {
  getEditingModelIdRaw,
  setEditingModelId,
} from './settingsRepo';

export type ModelSource = 'manual' | 'template' | 'import';

export function getModels(): RoutineModel[] {
  return db.select().from(routineModels).where(eq(routineModels.deleted, 0)).orderBy(asc(routineModels.id)).all();
}

export function getModelById(id: number): RoutineModel | undefined {
  return db.select().from(routineModels).where(and(eq(routineModels.id, id), eq(routineModels.deleted, 0))).get();
}

export function createModel(name: string, source: ModelSource = 'manual'): number {
  const row = db
    .insert(routineModels)
    .values({ name: name.trim() || 'Modelo', source, createdAt: new Date().toISOString() })
    .returning({ id: routineModels.id })
    .get();
  return row!.id;
}

export function renameModel(id: number, name: string): void {
  db.update(routineModels).set({ name: name.trim() || 'Modelo' }).where(eq(routineModels.id, id)).run();
}

/** Soft-deletes a model and its blocks; moves the editing pointer if needed. */
export function deleteModel(id: number): void {
  db.transaction((tx) => {
    tx.update(routineBlocks).set({ deleted: 1 }).where(eq(routineBlocks.modelId, id)).run();
    tx.delete(rotationItems).where(eq(rotationItems.modelId, id)).run(); // drop from the loop
    tx.update(weekAssignments).set({ deleted: 1 }).where(eq(weekAssignments.modelId, id)).run();
    tx.update(routineModels).set({ deleted: 1 }).where(eq(routineModels.id, id)).run();
  });
  if (getEditingModelIdRaw() === id) {
    const next = getModels()[0];
    if (next) setEditingModelId(next.id);
  }
}

/** Creates a copy of a model with all its blocks. Returns the new model id. */
export function duplicateModel(srcId: number, name: string): number {
  const id = createModel(name, 'manual');
  const src = db
    .select()
    .from(routineBlocks)
    .where(and(eq(routineBlocks.modelId, srcId), eq(routineBlocks.deleted, 0)))
    .all();
  const rows = src.map((b) => ({
    modelId: id,
    dayLabel: b.dayLabel,
    start: b.start,
    end: b.end,
    durationMin: b.durationMin,
    activity: b.activity,
    categoryId: b.categoryId,
    note: b.note,
    sortOrder: b.sortOrder,
    topic: b.topic,
  }));
  for (let i = 0; i < rows.length; i += 50) {
    db.insert(routineBlocks).values(rows.slice(i, i + 50)).run();
  }
  return id;
}

/**
 * The model currently being edited/used. Resolves the saved pointer, falling back
 * to the first model (and persisting it). Guarantees a model exists.
 */
export function getEditingModelId(): number {
  const raw = getEditingModelIdRaw();
  const models = getModels();
  if (raw != null && models.some((m) => m.id === raw)) return raw;
  const first = models[0];
  if (first) {
    setEditingModelId(first.id);
    return first.id;
  }
  const id = createModel('Minha rotina', 'manual');
  setEditingModelId(id);
  return id;
}
