import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { settings } from '@/db/schema';
import { DEFAULT_NOTIF_PREFS } from '@/lib/notifications';
import type { NotifPrefs, NotifScope } from '@/lib/notifications';
import type { ThemeMode } from '@/lib/theme';

export function getSetting(key: string): string | null {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const existing = db
    .select({ key: settings.key })
    .from(settings)
    .where(eq(settings.key, key))
    .get();
  if (existing) db.update(settings).set({ value }).where(eq(settings.key, key)).run();
  else db.insert(settings).values({ key, value }).run();
}

export function deleteSetting(key: string): void {
  db.delete(settings).where(eq(settings.key, key)).run();
}

const THEME_KEY = 'theme_mode';

export function getThemeMode(): ThemeMode {
  const v = getSetting(THEME_KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

export function setThemeMode(mode: ThemeMode): void {
  setSetting(THEME_KEY, mode);
}

export type AppMode = 'agenda' | 'rotina';

export function getAppMode(): AppMode {
  return getSetting('app_mode') === 'rotina' ? 'rotina' : 'agenda';
}

export function setAppMode(mode: AppMode): void {
  setSetting('app_mode', mode);
}

// ─── notification prefs ───────────────────────────────────────────────────────

export function getNotifPrefs(): NotifPrefs {
  const scope = getSetting('notif_scope') as NotifScope | null;
  const lead = Number(getSetting('notif_lead_min'));
  return {
    enabled: getSetting('notif_enabled') === '1',
    scope: scope === 'todos' || scope === 'nenhum' || scope === 'importantes' ? scope : DEFAULT_NOTIF_PREFS.scope,
    leadMin: [0, 5, 10, 15].includes(lead) ? lead : DEFAULT_NOTIF_PREFS.leadMin,
    monthly: (getSetting('notif_monthly') ?? '1') === '1',
    dailySummary: (getSetting('notif_daily_summary') ?? '1') === '1',
  };
}

export function setNotifPrefs(p: NotifPrefs): void {
  setSetting('notif_enabled', p.enabled ? '1' : '0');
  setSetting('notif_scope', p.scope);
  setSetting('notif_lead_min', String(p.leadMin));
  setSetting('notif_monthly', p.monthly ? '1' : '0');
  setSetting('notif_daily_summary', p.dailySummary ? '1' : '0');
}

// ─── backup metadata ──────────────────────────────────────────────────────────

export function getLastBackupAt(): string | null {
  return getSetting('last_backup_at');
}

export function setLastBackupAt(iso: string): void {
  setSetting('last_backup_at', iso);
}

// ─── onboarding (start choice) ─────────────────────────────────────────────────

export function getStartChoiceDone(): boolean {
  return getSetting('start_choice_done') === '1';
}

export function setStartChoiceDone(done: boolean): void {
  setSetting('start_choice_done', done ? '1' : '0');
}

// ─── tabs visibility (Treino/Estudos ocultos por padrão) ───────────────────────

export function getShowTraining(): boolean {
  return getSetting('show_training') === '1';
}

export function setShowTraining(v: boolean): void {
  setSetting('show_training', v ? '1' : '0');
}

export function getShowStudies(): boolean {
  return getSetting('show_studies') === '1';
}

export function setShowStudies(v: boolean): void {
  setSetting('show_studies', v ? '1' : '0');
}

// ─── routine models (S9) ───────────────────────────────────────────────────────

export function getEditingModelIdRaw(): number | null {
  const v = getSetting('editing_model_id');
  return v ? Number(v) : null;
}

export function setEditingModelId(id: number): void {
  setSetting('editing_model_id', String(id));
}
