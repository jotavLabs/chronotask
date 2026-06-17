// Hand-written migration bundle in drizzle-orm/expo-sqlite/migrator format.
// Keys use m + zero-padded idx (e.g. m0000). SQL split by "--> statement-breakpoint".
// To add a future migration: add a new journal entry and a new m000N key.

const migrations = {
  journal: {
    entries: [
      { idx: 0, when: 0, tag: '0000_initial', breakpoints: true },
      { idx: 1, when: 1, tag: '0001_sprint4', breakpoints: true },
      { idx: 2, when: 2, tag: '0002_topic', breakpoints: true },
      { idx: 3, when: 3, tag: '0003_sync', breakpoints: true },
      { idx: 4, when: 4, tag: '0004_skip_holiday', breakpoints: true },
      { idx: 5, when: 5, tag: '0005_models', breakpoints: true },
      { idx: 6, when: 6, tag: '0006_rotation', breakpoints: true },
    ],
  },
  migrations: {
    m0006: [
      "CREATE TABLE IF NOT EXISTS `rotation` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `enabled` integer NOT NULL DEFAULT 0, `mode` text NOT NULL DEFAULT 'loop', `period` text NOT NULL DEFAULT 'weekly', `anchor_date` text, `updated_at` text, `deleted` integer DEFAULT 0 NOT NULL);",
      'CREATE TABLE IF NOT EXISTS `rotation_items` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `position` integer NOT NULL DEFAULT 0, `model_id` integer NOT NULL, `updated_at` text, `deleted` integer DEFAULT 0 NOT NULL);',
      'CREATE TABLE IF NOT EXISTS `week_assignments` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `period_start` text NOT NULL, `model_id` integer NOT NULL, `updated_at` text, `deleted` integer DEFAULT 0 NOT NULL);',
      "INSERT INTO `rotation` (`enabled`, `mode`, `period`, `anchor_date`, `updated_at`, `deleted`) VALUES (0, 'loop', 'weekly', strftime('%Y-%m-%d','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0);",
    ]
      .concat(
        ['rotation', 'rotation_items', 'week_assignments'].flatMap((t) => [
          `CREATE TRIGGER IF NOT EXISTS \`${t}_sync_ins\` AFTER INSERT ON \`${t}\` WHEN NEW.updated_at IS NULL BEGIN UPDATE \`${t}\` SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE rowid = NEW.rowid; END;`,
          `CREATE TRIGGER IF NOT EXISTS \`${t}_sync_upd\` AFTER UPDATE ON \`${t}\` WHEN NEW.updated_at IS OLD.updated_at BEGIN UPDATE \`${t}\` SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE rowid = NEW.rowid; END;`,
        ]),
      )
      .join('\n--> statement-breakpoint\n'),
    m0005: [
      'CREATE TABLE IF NOT EXISTS `routine_models` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `name` text NOT NULL, `created_at` text, `source` text, `updated_at` text, `deleted` integer DEFAULT 0 NOT NULL);',
      'ALTER TABLE `routine_blocks` ADD COLUMN `model_id` integer;',
      "INSERT INTO `routine_models` (`name`, `created_at`, `source`, `updated_at`, `deleted`) VALUES ('Minha rotina', strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'manual', strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0);",
      'UPDATE `routine_blocks` SET `model_id` = (SELECT `id` FROM `routine_models` ORDER BY `id` LIMIT 1) WHERE `model_id` IS NULL;',
      "CREATE TRIGGER IF NOT EXISTS `routine_models_sync_ins` AFTER INSERT ON `routine_models` WHEN NEW.updated_at IS NULL BEGIN UPDATE `routine_models` SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE rowid = NEW.rowid; END;",
      "CREATE TRIGGER IF NOT EXISTS `routine_models_sync_upd` AFTER UPDATE ON `routine_models` WHEN NEW.updated_at IS OLD.updated_at BEGIN UPDATE `routine_models` SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE rowid = NEW.rowid; END;",
    ].join('\n--> statement-breakpoint\n'),
    m0004: 'ALTER TABLE `categories` ADD COLUMN `skip_on_holiday` integer DEFAULT 0 NOT NULL;',
    m0003: [
      'categories', 'routine_blocks', 'monthly_routines', 'events', 'holidays',
      'completions', 'training_days', 'exercises', 'exercise_logs',
    ]
      .flatMap((t) => [
        `ALTER TABLE \`${t}\` ADD COLUMN \`updated_at\` text;`,
        `ALTER TABLE \`${t}\` ADD COLUMN \`deleted\` integer DEFAULT 0 NOT NULL;`,
        `CREATE TRIGGER IF NOT EXISTS \`${t}_sync_ins\` AFTER INSERT ON \`${t}\` WHEN NEW.updated_at IS NULL BEGIN UPDATE \`${t}\` SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE rowid = NEW.rowid; END;`,
        `CREATE TRIGGER IF NOT EXISTS \`${t}_sync_upd\` AFTER UPDATE ON \`${t}\` WHEN NEW.updated_at IS OLD.updated_at BEGIN UPDATE \`${t}\` SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE rowid = NEW.rowid; END;`,
      ])
      .concat('CREATE TABLE IF NOT EXISTS `sync_state` (`key` text PRIMARY KEY NOT NULL, `value` text NOT NULL);')
      .join('\n--> statement-breakpoint\n'),
    m0002: `
ALTER TABLE \`routine_blocks\` ADD COLUMN \`topic\` text;
    `,
    m0001: `
CREATE TABLE IF NOT EXISTS \`settings\` (
  \`key\` text PRIMARY KEY NOT NULL,
  \`value\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`training_days\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`label\` text NOT NULL,
  \`weekday\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`exercises\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`training_day_id\` integer NOT NULL REFERENCES \`training_days\`(\`id\`),
  \`name\` text NOT NULL,
  \`pattern\` text,
  \`type\` text,
  \`sets\` text,
  \`reps\` text,
  \`rest\` text,
  \`ladder\` text,
  \`note\` text,
  \`sort_order\` integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`exercise_logs\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`exercise_id\` integer NOT NULL REFERENCES \`exercises\`(\`id\`),
  \`date\` text NOT NULL,
  \`set_number\` integer NOT NULL,
  \`reps\` integer,
  \`hold_seconds\` integer,
  \`note\` text,
  \`logged_at\` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`exercises_day_idx\` ON \`exercises\` (\`training_day_id\`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`exercise_logs_idx\` ON \`exercise_logs\` (\`exercise_id\`, \`date\`);
    `,
    m0000: `
CREATE TABLE IF NOT EXISTS \`categories\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`name\` text NOT NULL,
  \`cut_order\` integer,
  \`tie_group\` text,
  \`protected\` integer NOT NULL DEFAULT 0,
  \`color\` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`routine_blocks\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`day_label\` text NOT NULL,
  \`start\` text NOT NULL,
  \`end\` text NOT NULL,
  \`duration_min\` integer NOT NULL,
  \`activity\` text NOT NULL,
  \`category_id\` integer REFERENCES \`categories\`(\`id\`),
  \`note\` text,
  \`sort_order\` integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`monthly_routines\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`name\` text NOT NULL,
  \`window_start_day\` integer NOT NULL,
  \`window_end_day\` integer NOT NULL,
  \`duration_min\` integer NOT NULL,
  \`scheduled_date\` text,
  \`last_done\` text,
  \`suggested_block\` text,
  \`category_id\` integer REFERENCES \`categories\`(\`id\`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`events\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`date\` text NOT NULL,
  \`start\` text NOT NULL,
  \`end\` text NOT NULL,
  \`title\` text NOT NULL,
  \`category_id\` integer REFERENCES \`categories\`(\`id\`),
  \`duration_min\` integer NOT NULL,
  \`priority\` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`holidays\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`date\` text NOT NULL,
  \`name\` text NOT NULL,
  \`type\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS \`completions\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`date\` text NOT NULL,
  \`ref_type\` text NOT NULL,
  \`ref_id\` integer NOT NULL,
  \`done\` integer NOT NULL DEFAULT 0,
  \`value_note\` text,
  \`logged_at\` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`completions_date_idx\` ON \`completions\` (\`date\`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`blocks_day_idx\` ON \`routine_blocks\` (\`day_label\`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS \`completion_unique\` ON \`completions\` (\`date\`, \`ref_type\`, \`ref_id\`);
    `,
  },
};

export default migrations;
