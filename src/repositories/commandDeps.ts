// Builds the (impure) CommandDeps for the chat parser from the repos + engine.
// Keeps SQL/engine wiring out of the screen and the pure parser.

import type { CommandDeps } from '@/lib/commands';
import { getWeekDates, resolveDayLabel, shortWeekdayPt, toIsoDate } from '@/lib/dayResolver';
import { getMonthlyStatus, MONTHLY_STATUS_LABEL } from '@/lib/recurrence';
import { monthRange, timeByTopic } from '@/lib/stats';
import { trainingForDate } from '@/lib/trainingResolver';
import { getBlocksForDayByCategory } from '@/repositories/blocksRepo';
import { getHolidaysList } from '@/repositories/categoriesRepo';
import { loadAdaptedDay } from '@/repositories/adaptedDayRepo';
import { getAllMonthly } from '@/repositories/monthlyRoutinesRepo';
import { getCompletedBlocks } from '@/repositories/statsRepo';
import { getExercisesForDay, getTrainingDays } from '@/repositories/trainingRepo';

const VERDICT: Record<string, string> = {
  OK: 'Dia normal',
  AJUSTADO: 'Dia adaptado',
  CONFLITO: '⚠ Conflito',
  IMPOSSIVEL: 'Impossível encaixar tudo',
  FERIADO: 'Feriado',
};

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function buildCommandDeps(): CommandDeps {
  return {
    today: new Date(),

    holidaysForYear() {
      const year = new Date().getFullYear();
      return getHolidaysList().filter((h) => h.date.startsWith(String(year)));
    },

    holidaysInMonth(month) {
      const year = new Date().getFullYear();
      const mm = String(month + 1).padStart(2, '0');
      return getHolidaysList().filter((h) => h.date.startsWith(`${year}-${mm}`));
    },

    adaptedDay(date) {
      const day = loadAdaptedDay(date);
      const head = `${VERDICT[day.verdict] ?? day.verdict}${day.demand > 0 ? ` · demanda ${day.demand}min` : ''}`;
      const items = day.timeline
        .filter((i) => !i.removed)
        .map((i) => `${i.start}–${i.end} ${i.activity}`);
      return [head, ...items];
    },

    week() {
      return getWeekDates(new Date()).map((d) => {
        const label = resolveDayLabel(d);
        return `${shortWeekdayPt(d)} ${d.getDate()} — ${label}`;
      });
    },

    training(date) {
      const day = trainingForDate(date, getTrainingDays());
      if (!day) return ['Sem treino hoje (dia de descanso).'];
      const ex = getExercisesForDay(day.id);
      return [`${day.label}:`, ...ex.map((e) => `• ${e.name} — ${e.sets}×${e.reps}`)];
    },

    studies(date) {
      const label = resolveDayLabel(date);
      const blocks = getBlocksForDayByCategory(label, 'Estudo');
      if (blocks.length === 0) return ['Nenhum bloco de estudo hoje.'];
      return blocks.map((b) => `${b.start} ${b.activity}${b.topic ? ` [${b.topic}]` : ''}`);
    },

    monthly() {
      const today = new Date();
      const rows = getAllMonthly();
      if (rows.length === 0) return ['Nenhuma rotina mensal.'];
      return rows.map((m) => {
        const status = getMonthlyStatus(m, today);
        const label = MONTHLY_STATUS_LABEL[status];
        return `${m.name}${label ? ` — ${label}` : ''}`;
      });
    },

    nextBlock(date) {
      const day = loadAdaptedDay(date);
      const nowMin = date.getHours() * 60 + date.getMinutes();
      const upcoming = day.timeline
        .filter((i) => !i.removed && timeToMin(i.start) >= nowMin)
        .sort((a, b) => timeToMin(a.start) - timeToMin(b.start))[0];
      return upcoming ? `${upcoming.start}–${upcoming.end} ${upcoming.activity}` : null;
    },

    topicTime(topic) {
      const now = new Date();
      const { startIso, endIso } = monthRange(now.getFullYear(), now.getMonth());
      const stats = timeByTopic(getCompletedBlocks(startIso, endIso));
      const found = stats.find((t) => t.topic === topic);
      return found ? { minutes: found.minutes, sessions: found.sessions } : { minutes: 0, sessions: 0 };
    },
  };
}
