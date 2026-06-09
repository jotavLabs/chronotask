// Pure stats aggregations. No DB — the repo loads rows and passes them in.
// All durations are the PLANNED block duration (not the adaptation-adjusted one).

import { toIsoDate } from './dayResolver';

export type CompletedBlock = {
  date: string;
  topic: string | null;
  category: string | null;
  durationMin: number;
};

export type TopicStat = { topic: string; minutes: number; sessions: number };
export type CategoryStat = { category: string; minutes: number; sessions: number };
export type Consistency = { key: string; scheduled: number; completed: number; percent: number };
export type VolumePoint = { exercise: string; reps: number };

/** Trackable non-study categories. Easy to tweak. Study is handled by topic. */
export const TRACKABLE_CATEGORIES = ['Treino', 'Cardio', 'Mobilidade', 'Leitura'];

/** Inclusive month range [first day, last day] as ISO strings. month is 0–11. */
export function monthRange(year: number, month: number): { startIso: string; endIso: string } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { startIso: toIsoDate(start), endIso: toIsoDate(end) };
}

/** Study time per topic = sessions done × planned block duration. */
export function timeByTopic(completed: CompletedBlock[]): TopicStat[] {
  const map = new Map<string, { minutes: number; sessions: number }>();
  for (const c of completed) {
    if (!c.topic) continue;
    const e = map.get(c.topic) ?? { minutes: 0, sessions: 0 };
    e.minutes += c.durationMin;
    e.sessions += 1;
    map.set(c.topic, e);
  }
  return [...map.entries()]
    .map(([topic, v]) => ({ topic, ...v }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** Time per trackable category (Treino/Cardio/Mobilidade/Leitura). */
export function timeByCategory(completed: CompletedBlock[]): CategoryStat[] {
  const map = new Map<string, { minutes: number; sessions: number }>();
  for (const c of completed) {
    if (!c.category || !TRACKABLE_CATEGORIES.includes(c.category)) continue;
    const e = map.get(c.category) ?? { minutes: 0, sessions: 0 };
    e.minutes += c.durationMin;
    e.sessions += 1;
    map.set(c.category, e);
  }
  return [...map.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** Completed vs scheduled per key (topic or category), as percentages. */
export function consistency(
  scheduled: Record<string, number>,
  completed: Record<string, number>,
): Consistency[] {
  const keys = new Set([...Object.keys(scheduled), ...Object.keys(completed)]);
  return [...keys]
    .map((key) => {
      const s = scheduled[key] ?? 0;
      const c = completed[key] ?? 0;
      return { key, scheduled: s, completed: c, percent: s > 0 ? Math.round((c / s) * 100) : 0 };
    })
    .sort((a, b) => b.percent - a.percent);
}

/** Total reps per exercise from logs (training volume). */
export function trainingVolume(logs: { exercise: string; reps: number }[]): VolumePoint[] {
  const map = new Map<string, number>();
  for (const l of logs) map.set(l.exercise, (map.get(l.exercise) ?? 0) + l.reps);
  return [...map.entries()]
    .map(([exercise, reps]) => ({ exercise, reps }))
    .sort((a, b) => b.reps - a.reps);
}
