import { mergeChanges } from '../sync';
import type { SyncRow } from '../sync';

const row = (id: number, updated_at: string, deleted = 0): SyncRow => ({ id, updated_at, deleted });

describe('mergeChanges (last-write-wins)', () => {
  it('applies a newer remote row locally', () => {
    const r = mergeChanges([row(1, '2026-06-01')], [row(1, '2026-06-02')]);
    expect(r.toApplyLocally).toEqual([row(1, '2026-06-02')]);
    expect(r.toPush).toEqual([]);
  });

  it('pushes a newer local row', () => {
    const r = mergeChanges([row(1, '2026-06-03')], [row(1, '2026-06-02')]);
    expect(r.toPush).toEqual([row(1, '2026-06-03')]);
    expect(r.toApplyLocally).toEqual([]);
  });

  it('pushes local-only and applies remote-only', () => {
    const r = mergeChanges([row(1, '2026-06-01')], [row(2, '2026-06-01')]);
    expect(r.toPush.map((x) => x.id)).toEqual([1]);
    expect(r.toApplyLocally.map((x) => x.id)).toEqual([2]);
  });

  it('does nothing on a tie', () => {
    const r = mergeChanges([row(1, '2026-06-02')], [row(1, '2026-06-02')]);
    expect(r.toApplyLocally).toEqual([]);
    expect(r.toPush).toEqual([]);
  });

  it('propagates a remote soft delete that is newer', () => {
    const r = mergeChanges([row(1, '2026-06-01', 0)], [row(1, '2026-06-05', 1)]);
    expect(r.toApplyLocally).toEqual([row(1, '2026-06-05', 1)]);
  });

  it('a local delete newer than remote is pushed', () => {
    const r = mergeChanges([row(1, '2026-06-05', 1)], [row(1, '2026-06-01', 0)]);
    expect(r.toPush).toEqual([row(1, '2026-06-05', 1)]);
  });
});
