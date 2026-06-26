import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Soft-delete + timestamp columns shared by every domain table. updated_at is
// kept by triggers; deleted=1 is the app-wide soft delete (rows are filtered by
// deleted=0 in every repository).
const syncCols = {
  updatedAt: text('updated_at'),
  deleted: integer('deleted').notNull().default(0),
};

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  cutOrder: integer('cut_order'),
  tieGroup: text('tie_group'),
  protected: integer('protected').notNull().default(0),
  color: text('color'),
  skipOnHoliday: integer('skip_on_holiday').notNull().default(0), // 1 = sai da rotina em feriado
  fixedTime: integer('fixed_time').notNull().default(0), // 1 = ancora no horário marcado (ainda cortável)
  ...syncCols,
});

// Saved routine models (S9). Each block belongs to a model; the active model is
// the one being edited (settings editing_model_id) — used for every day.
export const routineModels = sqliteTable('routine_models', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  createdAt: text('created_at'),
  source: text('source'), // manual | template | import
  ...syncCols,
});

export const routineBlocks = sqliteTable('routine_blocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  modelId: integer('model_id').references(() => routineModels.id),
  dayLabel: text('day_label').notNull(),
  start: text('start').notNull(),
  end: text('end').notNull(),
  durationMin: integer('duration_min').notNull(),
  activity: text('activity').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  note: text('note'),
  sortOrder: integer('sort_order').notNull().default(0),
  topic: text('topic'), // normalized study topic (S5), nullable
  ...syncCols,
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
  ...syncCols,
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
  recurrence: text('recurrence').notNull().default('none'), // none | weekly | monthly | yearly
  reminderMin: integer('reminder_min').notNull().default(-1), // -1 sem lembrete; 0 no horário; N min antes
  ...syncCols,
});

export const holidays = sqliteTable('holidays', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  ...syncCols,
});

export const completions = sqliteTable('completions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  refType: text('ref_type').notNull(),
  refId: integer('ref_id').notNull(),
  done: integer('done').notNull().default(0),
  valueNote: text('value_note'),
  loggedAt: text('logged_at').notNull(),
  ...syncCols,
});

// ─── Sprint 4: settings + treino ──────────────────────────────────────────────

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const trainingDays = sqliteTable('training_days', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(), // 'Upper A' | 'Lower A' | 'Upper B' | 'Lower B'
  weekday: text('weekday').notNull(), // 'Seg' | 'Ter' | 'Qui' | 'Sex'
  ...syncCols,
});

export const exercises = sqliteTable('exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  trainingDayId: integer('training_day_id')
    .notNull()
    .references(() => trainingDays.id),
  name: text('name').notNull(),
  pattern: text('pattern'),
  type: text('type'), // força | isometria | acessório | core | potência
  sets: text('sets'),
  reps: text('reps'),
  rest: text('rest'),
  ladder: text('ladder'),
  note: text('note'),
  sortOrder: integer('sort_order').notNull().default(0),
  ...syncCols,
});

export const exerciseLogs = sqliteTable('exercise_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exerciseId: integer('exercise_id')
    .notNull()
    .references(() => exercises.id),
  date: text('date').notNull(),
  setNumber: integer('set_number').notNull(),
  reps: integer('reps'),
  holdSeconds: integer('hold_seconds'),
  note: text('note'),
  loggedAt: text('logged_at').notNull(),
  ...syncCols,
});

export type Category = typeof categories.$inferSelect;
export type RoutineModel = typeof routineModels.$inferSelect;
export type RoutineBlock = typeof routineBlocks.$inferSelect;
export type MonthlyRoutine = typeof monthlyRoutines.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Holiday = typeof holidays.$inferSelect;
export type Completion = typeof completions.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type TrainingDay = typeof trainingDays.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type ExerciseLog = typeof exerciseLogs.$inferSelect;
