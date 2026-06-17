import { router, useFocusEffect } from 'expo-router';
import type { Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { RoutineModel } from '@/db/schema';
import { deleteModel, duplicateModel, getEditingModelId, getModels } from '@/repositories/modelsRepo';
import { setEditingModelId } from '@/repositories/settingsRepo';

const SOURCE_LABEL: Record<string, string> = { manual: 'Manual', template: 'Template', import: 'Importado' };

export default function ModelosScreen() {
  const [models, setModels] = useState<RoutineModel[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const load = useCallback(() => {
    setModels(getModels());
    setEditingId(getEditingModelId());
  }, []);
  useFocusEffect(load);

  function edit(id: number) {
    setEditingModelId(id);
    router.push('/gerenciar/blocos');
  }

  function onDuplicate(m: RoutineModel) {
    duplicateModel(m.id, `${m.name} (cópia)`);
    load();
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        <View className="flex-row mb-3">
          <TouchableOpacity
            onPress={() => router.push('/gerenciar/modelo-form' as Href)}
            className="flex-1 bg-blue-600 rounded-xl py-3 items-center mr-2"
          >
            <Text className="text-white font-semibold text-sm">+ Novo modelo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/gerenciar/importar' as Href)}
            className="flex-1 rounded-xl py-3 items-center border border-blue-600"
          >
            <Text className="text-blue-600 dark:text-blue-400 font-semibold text-sm">Importar por IA</Text>
          </TouchableOpacity>
        </View>

        {models.map((m) => {
          const isEditing = m.id === editingId;
          return (
            <View
              key={m.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-3 mb-2"
              style={{ borderLeftWidth: 3, borderLeftColor: isEditing ? '#3B82F6' : 'transparent' }}
            >
              <TouchableOpacity onPress={() => edit(m.id)} className="flex-row items-center">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900 dark:text-white">{m.name}</Text>
                  <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {SOURCE_LABEL[m.source ?? 'manual'] ?? 'Manual'}
                    {isEditing ? ' · em edição' : ''}
                  </Text>
                </View>
                <Text className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Editar →</Text>
              </TouchableOpacity>

              <View className="flex-row mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                <TouchableOpacity onPress={() => router.push(`/gerenciar/modelo-form?id=${m.id}` as Href)} className="mr-4">
                  <Text className="text-xs text-gray-600 dark:text-gray-300">Renomear</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDuplicate(m)} className="mr-4">
                  <Text className="text-xs text-gray-600 dark:text-gray-300">Duplicar</Text>
                </TouchableOpacity>
                {models.length > 1 && (
                  <TouchableOpacity onPress={() => setPendingDelete(m.id)}>
                    <Text className="text-xs text-red-500">Excluir</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <ConfirmDialog
        visible={pendingDelete != null}
        title="Excluir modelo?"
        message="Os blocos deste modelo serão removidos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (pendingDelete != null) deleteModel(pendingDelete);
          setPendingDelete(null);
          load();
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}
