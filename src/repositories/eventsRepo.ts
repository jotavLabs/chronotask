import { asc, eq, gte } from 'drizzle-orm';
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
    .where(gte(events.date, fromIso))
    .orderBy(asc(events.date), asc(events.start))
    .all();
  return rows as EventWithCategory[];
}

export function getAllEvents(): EventWithCategory[] {
  const rows = db
    .select(selection)
    .from(events)
    .leftJoin(categories, eq(events.categoryId, categories.id))
    .orderBy(asc(events.date), asc(events.start))
    .all();
  return rows as EventWithCategory[];
}

export function getEventById(id: number): Event | undefined {
  return db.select().from(events).where(eq(events.id, id)).get();
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
  db.delete(events).where(eq(events.id, id)).run();
}
