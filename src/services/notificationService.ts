import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { buildNotificationPlan } from '@/lib/notifications';
import { getMonthlyStatus } from '@/lib/recurrence';
import { loadAdaptedDay } from '@/repositories/adaptedDayRepo';
import { getAllMonthly } from '@/repositories/monthlyRoutinesRepo';
import { getNotifPrefs } from '@/repositories/settingsRepo';

let configured = false;

/** Foreground handler + Android channel. Safe to call multiple times. */
export function configureNotifications(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Lembretes',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {});
  }
}

export async function requestNotifPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function hasNotifPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Cancels everything and reschedules the plan for today + the next 2 days, from
 * the Adapted Day. Call on boot, after changing prefs, or after importing data.
 * Relies on the app being opened at least once a day (normal usage).
 */
export async function rescheduleNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    return;
  }
  const prefs = getNotifPrefs();
  if (!prefs.enabled) return;

  const now = new Date();
  const monthly = getAllMonthly();
  for (let offset = 0; offset <= 2; offset++) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    const adapted = loadAdaptedDay(date);
    const monthlyNotif = monthly.map((m) => ({
      name: m.name,
      status: getMonthlyStatus(m, date),
      windowStartDay: m.windowStartDay,
      windowEndDay: m.windowEndDay,
    }));
    const plan = buildNotificationPlan(date, adapted, monthlyNotif, prefs);
    for (const n of plan) {
      if (n.when.getTime() <= now.getTime()) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: n.title, body: n.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: n.when,
          channelId: 'default',
        },
      });
    }
  }
}
