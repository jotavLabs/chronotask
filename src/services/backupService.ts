import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { buildBackup, parseBackup } from '@/lib/backup';
import type { BackupData, ParseResult } from '@/lib/backup';
import { toIsoDate } from '@/lib/dayResolver';
import { getAllData, restoreData } from '@/repositories/backupRepo';
import { deleteSetting, getSetting, setLastBackupAt, setSetting } from '@/repositories/settingsRepo';

/** Builds the JSON backup, saves it and opens the share sheet. */
export async function exportBackup(): Promise<{ ok: boolean; error?: string }> {
  try {
    const file = buildBackup(getAllData());
    const json = JSON.stringify(file, null, 2);
    const filename = `rotina-backup-${toIsoDate(new Date())}.json`;
    const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
    const uri = base + filename;
    await FileSystem.writeAsStringAsync(uri, json);
    setLastBackupAt(new Date().toISOString());
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Backup da rotina' });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Falha ao exportar.' };
  }
}

/** Picks and parses a backup file. Does not write — the caller confirms first. */
export async function pickBackup(): Promise<ParseResult & { canceled?: boolean }> {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return { ok: false, error: 'cancelado', canceled: true };
    const json = await FileSystem.readAsStringAsync(res.assets[0].uri);
    return parseBackup(json);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível ler o arquivo.' };
  }
}

/** Applies a validated backup (overwrites everything, atomically). */
export function applyBackup(data: BackupData): void {
  restoreData(data);
}

// ─── automatic backup (Android Storage Access Framework) ────────────────────────
// The user grants a folder once (e.g. a Drive-synced folder); the app then writes
// a backup there silently on open. Survives uninstall/device loss, unlike the
// app-private storage. iOS has no SAF — these are no-ops there.

const SAF = FileSystem.StorageAccessFramework;
const DIR_KEY = 'auto_backup_dir';
const AT_KEY = 'auto_backup_at';
const DUE_MS = 20 * 60 * 60 * 1000; // ~daily

export function isAutoBackupOn(): boolean {
  return getSetting(DIR_KEY) != null;
}

export function getLastAutoBackupAt(): string | null {
  return getSetting(AT_KEY);
}

async function writeBackupTo(dirUri: string): Promise<void> {
  const json = JSON.stringify(buildBackup(getAllData()));
  const name = `chronotask-backup-${toIsoDate(new Date())}`;
  const uri = await SAF.createFileAsync(dirUri, name, 'application/json');
  await FileSystem.writeAsStringAsync(uri, json);
  setSetting(AT_KEY, new Date().toISOString());
}

/** One-time: pick a folder and write the first backup. Android only. */
export async function enableAutoBackup(): Promise<{ ok: boolean; error?: string }> {
  try {
    const perm = await SAF.requestDirectoryPermissionsAsync();
    if (!perm.granted) return { ok: false, error: 'cancelado' };
    setSetting(DIR_KEY, perm.directoryUri);
    await writeBackupTo(perm.directoryUri);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Falha ao ativar.' };
  }
}

export function disableAutoBackup(): void {
  deleteSetting(DIR_KEY);
  deleteSetting(AT_KEY);
}

/** On app open: writes a backup if a folder is set and the last one is older than ~1 day. */
export async function autoBackupIfDue(): Promise<void> {
  const dir = getSetting(DIR_KEY);
  if (!dir) return;
  const last = getSetting(AT_KEY);
  if (last && Date.now() - new Date(last).getTime() < DUE_MS) return;
  try {
    await writeBackupTo(dir);
  } catch {
    deleteSetting(DIR_KEY); // permission revoked / folder gone → turn it off
    deleteSetting(AT_KEY);
  }
}
