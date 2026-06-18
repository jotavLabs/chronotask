import { resolveModelForDate } from '@/lib/scheduling';
import type { Resolution, SchedulingConfig } from '@/lib/scheduling';
import { getAssignments } from './assignmentsRepo';
import { getEditingModelId, getModelById } from './modelsRepo';
import { getRotationItems, getRotationRow } from './rotationRepo';
import { getLastUsedModelIdRaw, setLastUsedModelId } from './settingsRepo';

/** Reads rotation + items + assignments into the pure scheduler's config shape. */
export function loadSchedulingConfig(): SchedulingConfig {
  const r = getRotationRow();
  return {
    rotation: r
      ? {
          enabled: r.enabled === 1,
          mode: r.mode,
          period: r.period === 'monthly' ? 'monthly' : 'weekly',
          anchorDate: r.anchorDate ?? '1970-01-01',
        }
      : null,
    items: getRotationItems().map((i) => ({ position: i.position, modelId: i.modelId })),
    assignments: getAssignments().map((a) => ({ periodStart: a.periodStart, modelId: a.modelId })),
  };
}

export function getResolutionForDate(date: Date): Resolution {
  return resolveModelForDate(date, loadSchedulingConfig());
}

/**
 * The model to display for a date: resolved (assignment/rotation) when valid, else
 * the last used model, else the editing model. Always returns a valid model id.
 */
export function getModelIdForDate(date: Date): number {
  const res = resolveModelForDate(date, loadSchedulingConfig());
  const last = getLastUsedModelIdRaw();
  if (res.modelId != null && getModelById(res.modelId)) {
    if (res.modelId !== last) setLastUsedModelId(res.modelId); // avoid a DB write on every call
    return res.modelId;
  }
  if (last != null && getModelById(last)) return last;
  return getEditingModelId();
}
