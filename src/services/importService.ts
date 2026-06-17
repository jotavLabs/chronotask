import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

export type PickResult =
  | { canceled: true }
  | { canceled: false; ok: true; raw: string }
  | { canceled: false; ok: false; error: string };

/** Picks a file and returns its raw text (the routine JSON is parsed by the caller). */
export async function pickRoutineFile(): Promise<PickResult> {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return { canceled: true };
    const raw = await FileSystem.readAsStringAsync(res.assets[0].uri);
    return { canceled: false, ok: true, raw };
  } catch (e) {
    return { canceled: false, ok: false, error: e instanceof Error ? e.message : 'Falha ao ler o arquivo.' };
  }
}
