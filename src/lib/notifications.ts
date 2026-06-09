// Pure notification planning. No expo-notifications here — the service consumes
// this plan. Reflects the Adapted Day (holidays/events/cuts already applied).

import type { AdaptedDay } from './adaptationEngine';
import { timeToMinutes } from './validation';

export type NotifType = 'block' | 'monthly' | 'daily';
export type ScheduledNotification = { when: Date; title: string; body: string; type: NotifType };

export type NotifScope = 'importantes' | 'todos' | 'nenhum';
export type NotifPrefs = {
  enabled: boolean;
  scope: NotifScope;
  leadMin: number; // 0 | 5 | 10 | 15
  monthly: boolean;
  dailySummary: boolean;
};

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  enabled: false,
  scope: 'importantes',
  leadMin: 0,
  monthly: true,
  dailySummary: true,
};

export type MonthlyNotif = {
  name: string;
  status: string; // from lib/recurrence
  windowStartDay: number;
  windowEndDay: number;
};

const IMPORTANT_CATEGORIES = new Set(['Treino', 'Estudo', 'Cardio']);
const WAKE_MIN = 360; // 06:00
const SLEEP_MIN = 1320; // 22:00
const MONTHLY_AT = 480; // 08:00

function isDuringSleep(min: number): boolean {
  return min >= SLEEP_MIN || min < WAKE_MIN;
}

function atTime(date: Date, minutes: number): Date {
  const d = new Date(date);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

const VERDICT_TEXT: Record<string, string> = {
  OK: 'dia normal',
  AJUSTADO: 'dia adaptado',
  CONFLITO: 'há um conflito',
  IMPOSSIVEL: 'agenda sobrecarregada',
  FERIADO: 'feriado',
};

/**
 * Builds the day's notification plan from the Adapted Day, monthly statuses and
 * user prefs. Nothing fires during sleep (22:00–06:00) except the wake summary.
 */
export function buildNotificationPlan(
  date: Date,
  adaptedDay: AdaptedDay,
  monthly: MonthlyNotif[],
  prefs: NotifPrefs,
): ScheduledNotification[] {
  if (!prefs.enabled) return [];
  const out: ScheduledNotification[] = [];

  if (prefs.dailySummary) {
    const count = adaptedDay.timeline.filter((i) => !i.removed && i.category !== 'Sono').length;
    out.push({
      when: atTime(date, WAKE_MIN),
      title: 'Resumo do dia',
      body: `${count} blocos — ${VERDICT_TEXT[adaptedDay.verdict] ?? 'seu dia'}.`,
      type: 'daily',
    });
  }

  if (prefs.scope !== 'nenhum') {
    for (const item of adaptedDay.timeline) {
      if (item.removed || item.category === 'Sono') continue;
      const include =
        prefs.scope === 'todos' ||
        item.source === 'event' ||
        (item.category != null && IMPORTANT_CATEGORIES.has(item.category));
      if (!include) continue;
      const startMin = timeToMinutes(item.start);
      if (startMin == null) continue;
      const notifMin = startMin - prefs.leadMin;
      if (isDuringSleep(notifMin)) continue;
      out.push({
        when: atTime(date, notifMin),
        title: item.activity,
        body: prefs.leadMin > 0 ? `Começa às ${item.start} (em ${prefs.leadMin} min)` : `Agora: ${item.start}–${item.end}`,
        type: 'block',
      });
    }
  }

  if (prefs.monthly) {
    for (const m of monthly) {
      if (m.status === 'AGENDAR') {
        out.push({
          when: atTime(date, MONTHLY_AT),
          title: 'Rotina mensal',
          body: `Hora de agendar: ${m.name} (janela ${m.windowStartDay}–${m.windowEndDay}).`,
          type: 'monthly',
        });
      } else if (m.status === 'ATRASADA') {
        out.push({
          when: atTime(date, MONTHLY_AT),
          title: 'Rotina mensal atrasada',
          body: `${m.name} está atrasada.`,
          type: 'monthly',
        });
      }
    }
  }

  return out.sort((a, b) => a.when.getTime() - b.when.getTime());
}
