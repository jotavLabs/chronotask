import type { RoutineBlock, Event } from '@/db/schema';

/**
 * Sprint 3 stub: adaptation engine.
 * Will consume time from day blocks when an event is added, sacrificing blocks
 * by cut_order priority (1=first cut) with proportional cut for tied groups.
 */
export function adaptDay(
  _blocks: RoutineBlock[],
  _events: Event[],
): RoutineBlock[] {
  // TODO Sprint 3: implement cascade sacrifice + proportional cut + reflow
  return _blocks;
}
