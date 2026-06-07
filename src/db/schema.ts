import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  cutOrder: integer('cut_order'),
  tieGroup: text('tie_group'),
  protected: integer('protected').notNull().default(0),
  color: text('color'),
});

export const routineBlocks = sqliteTable('routine_blocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  dayLabel: text('day_label').notNull(),
  start: text('start').notNull(),
  end: text('end').notNull(),
  durationMin: integer('duration_min').notNull(),
  activity: text('activity').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  note: text('note'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const monthlyRoutines = sqliteTable('monthly_routines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  windowStartDay: integer('window_start_day').notNull(),
  windowEndDay: integer('window_end_day').notNull(),
  durationMin: integer('duration_min').notNull(),
  scheduledDate: text('scheduled_date'),
  lastDone: text('last_done'),
  suggestedBlock: text('suggested_block'),
  categoryId: integer('category_id').references(() => categories.id),
});

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  start: text('start').notNull(),
  end: text('end').notNull(),
  title: text('title').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  durationMin: integer('duration_min').notNull(),
  priority: text('priority'),
});

export const holidays = sqliteTable('holidays', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
});

export const completions = sqliteTable('completions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  refType: text('ref_type').notNull(),
  refId: integer('ref_id').notNull(),
  done: integer('done').notNull().default(0),
  valueNote: text('value_note'),
  loggedAt: text('logged_at').notNull(),
});

export type Category = typeof categories.$inferSelect;
export type RoutineBlock = typeof routineBlocks.$inferSelect;
export type MonthlyRoutine = typeof monthlyRoutines.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Holiday = typeof holidays.$inferSelect;
export type Completion = typeof completions.$inferSelect;
