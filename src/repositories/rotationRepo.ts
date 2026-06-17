import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { rotation, rotationItems } from '@/db/schema';
import type { Rotation, RotationItem } from '@/db/schema';

export function getRotationRow(): Rotation | undefined {
  return db.select().from(rotation).where(eq(rotation.deleted, 0)).orderBy(asc(rotation.id)).get();
}

export function updateRotation(patch: { enabled?: boolean; period?: 'weekly' | 'monthly'; anchorDate?: string }): void {
  const row = getRotationRow();
  if (!row) return;
  const set: Partial<{ enabled: number; period: string; anchorDate: string }> = {};
  if (patch.enabled !== undefined) set.enabled = patch.enabled ? 1 : 0;
  if (patch.period !== undefined) set.period = patch.period;
  if (patch.anchorDate !== undefined) set.anchorDate = patch.anchorDate;
  db.update(rotation).set(set).where(eq(rotation.id, row.id)).run();
}

export function getRotationItems(): RotationItem[] {
  return db.select().from(rotationItems).where(eq(rotationItems.deleted, 0)).orderBy(asc(rotationItems.position)).all();
}

/** Replaces the loop with the given model ids (in order). */
export function setRotationItems(modelIds: number[]): void {
  db.transaction((tx) => {
    tx.delete(rotationItems).run();
    modelIds.forEach((modelId, position) => {
      tx.insert(rotationItems).values({ position, modelId }).run();
    });
  });
}
