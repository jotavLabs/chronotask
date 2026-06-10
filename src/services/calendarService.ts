import * as Calendar from 'expo-calendar';
import { mapDeviceEvents } from '@/lib/calendar';
import type { DeviceEvent } from '@/lib/calendar';
import { getOrCreateCategoryByName } from '@/repositories/categoriesRepo';
import { upsertEventByExternalId } from '@/repositories/eventsRepo';
import { getAgendaAutoImport, getAgendaCalendarIds, setAgendaLastImportAt } from '@/repositories/settingsRepo';

export type DeviceCalendar = { id: string; title: string; source: string; color?: string };
export type ImportSummary =
  | { ok: true; inserted: number; updated: number; total: number }
  | { ok: false; error: string };

const IMPORT_DAYS = 14;
const IMPORT_CATEGORY = 'Compromisso';
const IMPORT_PRIORITY = 'Média';

export async function requestCalendarAccess(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

/** Lists the device's event calendars (includes synced Google accounts). Requires permission. */
export async function listDeviceCalendars(): Promise<DeviceCalendar[]> {
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return cals.map((c) => ({
    id: c.id,
    title: c.title,
    source: c.source?.name ?? '',
    color: c.color,
  }));
}

/**
 * Reads the next ~14 days from the selected calendars and upserts them into `events`
 * (category "Compromisso", priority "Média"), de-duplicated by external_id. Read-only:
 * never writes back to the device calendar.
 */
export async function importAgenda(): Promise<ImportSummary> {
  const granted = await requestCalendarAccess();
  if (!granted) return { ok: false, error: 'Permissão de calendário negada.' };

  const calendarIds = getAgendaCalendarIds();
  if (calendarIds.length === 0) return { ok: false, error: 'Selecione ao menos um calendário.' };

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + IMPORT_DAYS);

  let raw: unknown[];
  try {
    raw = await Calendar.getEventsAsync(calendarIds, now, end);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Falha ao ler a agenda.' };
  }

  const mapped = mapDeviceEvents(raw as DeviceEvent[]);
  const categoryId = getOrCreateCategoryByName(IMPORT_CATEGORY);

  let inserted = 0;
  let updated = 0;
  for (const m of mapped) {
    const r = upsertEventByExternalId(m.externalId, {
      date: m.date,
      start: m.start,
      end: m.end,
      title: m.title,
      categoryId,
      priority: IMPORT_PRIORITY,
    });
    if (r === 'inserted') inserted += 1;
    else if (r === 'updated') updated += 1;
  }

  setAgendaLastImportAt(new Date().toISOString());
  return { ok: true, inserted, updated, total: mapped.length };
}

/** Runs an import on app open only when the user enabled auto-import. Silent on failure. */
export async function maybeAutoImportAgenda(): Promise<void> {
  if (!getAgendaAutoImport()) return;
  if (getAgendaCalendarIds().length === 0) return;
  try {
    await importAgenda();
  } catch {
    // boot-time best-effort; the manual button surfaces real errors
  }
}
