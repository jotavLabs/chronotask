import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { buildBackup, parseBackup } from '@/lib/backup';
import type { BackupData, ParseResult } from '@/lib/backup';
import { toIsoDate } from '@/lib/dayResolver';
import { getAllData, restoreData } from '@/repositories/backupRepo';
import { setLastBackupAt } from '@/repositories/settingsRepo';

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
