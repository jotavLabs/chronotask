import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  buildImportPrompt,
  daysInOrder,
  normalizeRoutine,
  parseRoutineJson,
} from '@/lib/routineImport';
import type { NormalizedRoutine } from '@/lib/routineImport';
import { getAllCategories } from '@/repositories/categoriesRepo';
import { createImportedModel } from '@/repositories/importRepo';
import { setEditingModelId } from '@/repositories/settingsRepo';
import { pickRoutineFile } from '@/services/importService';

export default function ImportarScreen() {
  const categories = useMemo(() => getAllCategories().map((c) => c.name), []);
  const defaultCat = categories.includes('Tempo Livre') ? 'Tempo Livre' : (categories[0] ?? 'Tempo Livre');
  const prompt = useMemo(() => buildImportPrompt(categories), [categories]);

  const [preview, setPreview] = useState<NormalizedRoutine | null>(null);
  const [name, setName] = useState('');

  async function onPick() {
    const r = await pickRoutineFile();
    if (r.canceled) return;
    if (!r.ok) {
      Alert.alert('Erro', r.error);
      return;
    }
    const parsed = parseRoutineJson(r.raw);
    if (!parsed.ok) {
      Alert.alert('Arquivo inválido', parsed.error);
      return;
    }
    const normalized = normalizeRoutine(parsed.data, { knownCategories: categories, defaultCategory: defaultCat });
    if (normalized.blocks.length === 0) {
      Alert.alert('Sem blocos', 'O arquivo não tinha blocos válidos. Gere de novo com o prompt.');
      return;
    }
    setPreview(normalized);
    setName(normalized.name);
  }

  function onCreate() {
    if (!preview) return;
    const id = createImportedModel(name.trim() || preview.name, preview.blocks);
    setEditingModelId(id);
    Alert.alert('Modelo criado', `"${name.trim() || preview.name}" foi importado e está em edição.`, [
      { text: 'OK', onPress: () => router.replace('/gerenciar/modelos' as Href) },
    ]);
  }

  if (preview) {
    const days = daysInOrder(preview.byDay);
    return (
      <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="text-xs text-gray-400 dark:text-gray-500 mb-1 px-1">Nome do modelo</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 mb-3"
        />

        {preview.warnings.length > 0 && (
          <View className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-3 mb-3">
            <Text className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 mb-1">Avisos</Text>
            {preview.warnings.map((w, i) => (
              <Text key={i} className="text-[11px] text-yellow-700 dark:text-yellow-300 leading-4">
                • {w}
              </Text>
            ))}
          </View>
        )}

        {days.map((d) => (
          <View key={d} className="bg-white dark:bg-gray-800 rounded-xl p-3 mb-2">
            <Text className="text-sm font-bold text-gray-900 dark:text-white mb-1">{d}</Text>
            {preview.byDay[d].map((b, i) => (
              <Text key={i} className="text-xs text-gray-600 dark:text-gray-300 leading-5">
                {b.start}–{b.end} · {b.activity} [{b.catName}]
              </Text>
            ))}
          </View>
        ))}

        <TouchableOpacity onPress={onCreate} className="bg-blue-600 rounded-lg py-3 items-center mt-2">
          <Text className="text-white font-semibold">Criar modelo</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPreview(null)} className="py-3 items-center mt-1">
          <Text className="text-gray-500 dark:text-gray-400 font-medium">Descartar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text className="text-sm text-gray-700 dark:text-gray-200 leading-5 mb-2">
        1. Copie o prompt abaixo, cole numa IA e descreva sua rotina. 2. Salve a resposta como um arquivo (.json ou .txt).
        3. Toque em "Selecionar arquivo" e confira o preview.
      </Text>

      <View className="bg-white dark:bg-gray-800 rounded-xl p-3 mb-1">
        <Text selectable className="text-[11px] text-gray-600 dark:text-gray-300 leading-4" style={{ fontFamily: 'monospace' }}>
          {prompt}
        </Text>
      </View>
      <Text className="text-[11px] text-gray-400 dark:text-gray-500 mb-4 px-1">
        Segure o texto para selecionar e copiar.
      </Text>

      <TouchableOpacity onPress={onPick} className="bg-blue-600 rounded-lg py-3 items-center">
        <Text className="text-white font-semibold">Selecionar arquivo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
