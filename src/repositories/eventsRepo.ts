import { and, asc, eq, gte } from 'drizzle-orm';
import { db } from '@/db/client';
import { categories, events } from '@/db/schema';
import type { Event } from '@/db/schema';
import { computeDuration } from '@/lib/validation';

export type EventWithCategory = Event & {
  categoryName: string | null;
  categoryColor: string | null;
};

export type EventInput = {
  date: string;
  start: string;
  end: string;
  title: string;
  categoryId: number | null;
  priority: string;
};

const selection = {
  id: events.id,
  date: events.date,
  start: events.start,
  end: events.end,
  title: events.title,
  categoryId: events.categoryId,
  durationMin: events.durationMin,
  priority: events.priority,
  categoryName: categories.name,
  categoryColor: categories.color,
};

export function getUpcomingEvents(fromIso: string): EventWithCategory[] {
  const rows = db
    .select(selection)
    .from(events)
    .leftJoin(categories, eq(events.categoryId, categories.id))
    .where(and(gte(events.date, fromIso), eq(events.deleted, 0)))
    .orderBy(asc(events.date), asc(events.start))
    .all();
  return rows as EventWithCategory[];
}

export function getEventsByDate(iso: string): EventWithCategory[] {
  const rows = db
    .select(selection)
    .from(events)
    .leftJoin(categories, eq(events.categoryId, categories.id))
    .where(and(eq(events.date, iso), eq(events.deleted, 0)))
    .orderBy(asc(events.start))
    .all();
  return rows as EventWithCategory[];
}

export function getAllEvents(): EventWithCategory[] {
  const rows = db
    .select(selection)
    .from(events)
    .leftJoin(categories, eq(events.categoryId, categories.id))
    .where(eq(events.deleted, 0))
    .orderBy(asc(events.date), asc(events.start))
    .all();
  return rows as EventWithCategory[];
}

export function getEventById(id: number): Event | undefined {
  return db.select().from(events).where(and(eq(events.id, id), eq(events.deleted, 0))).get();
}

export function createEvent(input: EventInput): number {
  const durationMin = computeDuration(input.start, input.end) ?? 0;
  const row = db
    .insert(events)
    .values({
      date: input.date,
      start: input.start,
      end: input.end,
      title: input.title.trim(),
      categoryId: input.categoryId,
      durationMin,
      priority: input.priority,
    })
    .returning({ id: events.id })
    .get();
  return row!.id;
}

export function updateEvent(id: number, input: EventInput): void {
  const durationMin = computeDuration(input.start, input.end) ?? 0;
  db
    .update(events)
    .set({
      date: input.date,
      start: input.start,
      end: input.end,
      title: input.title.trim(),
      categoryId: input.categoryId,
      durationMin,
      priority: input.priority,
    })
    .where(eq(events.id, id))
    .run();
}

export function deleteEvent(id: number): void {
  db.update(events).set({ deleted: 1 }).where(eq(events.id, id)).run();
}

export type ImportResult = 'inserted' | 'updated' | 'unchanged';

/**
 * Inserts or updates an event keyed by its device-calendar `external_id`.
 * Skips the write when nothing changed, so re-imports don't bump updated_at
 * (and don't create sync churn).
 */
export function upsertEventByExternalId(externalId: string, input: EventInput): ImportResult {
  const durationMin = computeDuration(input.start, input.end) ?? 0;
  const existing = db.select().from(events).where(eq(events.externalId, externalId)).get();

  if (existing) {
    const same =
      existing.date === input.date &&
      existing.start === input.start &&
      existing.end === input.end &&
      existing.title === input.title.trim() &&
      existing.categoryId === input.categoryId &&
      existing.priority === input.priority &&
      existing.deleted === 0;
    if (same) return 'unchanged';
    db.update(events)
      .set({
        date: input.date,
        start: input.start,
        end: input.end,
        title: input.title.trim(),
        categoryId: input.categoryId,
        durationMin,
        priority: input.priority,
        deleted: 0,
      })
      .where(eq(events.id, existing.id))
      .run();
    return 'updated';
  }

  db.insert(events)
    .values({
      date: input.date,
      start: input.start,
      end: input.end,
      title: input.title.trim(),
      categoryId: input.categoryId,
      durationMin,
      priority: input.priority,
      externalId,
    })
    .run();
  return 'inserted';
}
