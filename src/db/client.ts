import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const expo = openDatabaseSync('routine.db');
export const db = drizzle(expo, { schema });
export type DB = typeof db;

/** Raw expo-sqlite handle, used by the sync layer for generic per-table SQL. */
export const sqlite = expo;
