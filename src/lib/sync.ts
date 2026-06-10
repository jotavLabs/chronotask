// Pure last-write-wins merge for cloud sync. No network here.

export type SyncRow = { id: number; updated_at: string | null; deleted: number };
export type MergeResult<T> = { toApplyLocally: T[]; toPush: T[] };

const ts = (r: { updated_at: string | null }) => r.updated_at ?? '';

/**
 * Compares local and remote rows of one table by `updated_at` (last-write-wins).
 * `deleted` is just a field on the winning row, so soft deletes propagate.
 * Returns remote rows to apply locally and local rows to push to the cloud.
 */
export function mergeChanges<T extends SyncRow>(local: T[], remote: T[]): MergeResult<T> {
  const localById = new Map(local.map((r) => [r.id, r]));
  const remoteById = new Map(remote.map((r) => [r.id, r]));
  const toApplyLocally: T[] = [];
  const toPush: T[] = [];

  for (const r of remote) {
    const l = localById.get(r.id);
    if (!l || ts(r) > ts(l)) toApplyLocally.push(r);
  }
  for (const l of local) {
    const r = remoteById.get(l.id);
    if (!r || ts(l) > ts(r)) toPush.push(l);
  }
  return { toApplyLocally, toPush };
}
