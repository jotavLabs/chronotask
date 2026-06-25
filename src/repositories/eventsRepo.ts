import { and, asc, eq, ne, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { categories, events } from '@/db/schema';
import type { Event } from '@/db/schema';
import { eventOccursOn, nextOccurrenceIso } from '@/lib/recurrence';
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
  recurrence: string;
  reminderMin: number;
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
  recurrence: events.recurrence,
  reminderMin: events.reminderMin,
  categoryName: categories.name,
  categoryColor: categories.color,
};

/**
 * Upcoming events from `fromIso`: one-off events with date ≥ fromIso, plus the next
 * occurrence of every recurring event. The returned `date` is the occurrence date
 * (so the UI groups it correctly); `id` still points at the base event for editing.
 */
export function getUpcomingEvents(fromIso: string): EventWithCategory[] {
  const rows = db
    .select(selection)
    .from(events)
    .leftJoin(categories, eq(events.categoryId, categories.id))
    .where(eq(events.deleted, 0))
    .all() as EventWithCategory[];
  const out: EventWithCategory[] = [];
  for (const e of rows) {
    const next = nextOccurrenceIso(e.date, e.recurrence, fromIso);
    if (next) out.push({ ...e, date: next });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}

/** Events occurring on `iso`: one-offs on that date plus recurring events that land on it. */
export function getEventsByDate(iso: string): EventWithCategory[] {
  const rows = db
    .select(selection)
    .from(events)
    .leftJoin(categories, eq(events.categoryId, categories.id))
    .where(and(eq(events.deleted, 0), or(eq(events.date, iso), ne(events.recurrence, 'none'))))
    .orderBy(asc(events.start))
    .all() as EventWithCategory[];
  return rows.filter((e) => eventOccursOn(e.date, e.recurrence, iso));
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
      recurrence: input.recurrence,
      reminderMin: input.reminderMin,
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
      recurrence: input.recurrence,
      reminderMin: input.reminderMin,
    })
    .where(eq(events.id, id))
    .run();
}

export function deleteEvent(id: number): void {
  db.update(events).set({ deleted: 1 }).where(eq(events.id, id)).run();
}
