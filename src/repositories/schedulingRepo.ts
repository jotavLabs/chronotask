import { getEditingModelId } from './modelsRepo';

/**
 * The model applied on a date. Rotation/sequence was removed (this is a single-
 * routine agenda), so every day uses the active model — the one being edited.
 * The `date` param is kept for call-site compatibility and intentionally ignored.
 */
export function getModelIdForDate(_date?: Date): number {
  return getEditingModelId();
}
