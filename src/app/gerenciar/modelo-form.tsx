import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FormField } from '@/components/FormField';
import { createModel, getModelById, renameModel } from '@/repositories/modelsRepo';
import { setEditingModelId } from '@/repositories/settingsRepo';
import { applyTemplate } from '@/repositories/templatesRepo';

const INPUT =
  'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800';

type Base = 'vazio' | 'generica';

export default function ModeloForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const modelId = params.id ? Number(params.id) : null;
  const editing = modelId != null;

  const [name, setName] = useState('');
  const [base, setBase] = useState<Base>('vazio');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (modelId == null) return;
    const m = getModelById(modelId);
    if (m) setName(m.name);
  }, [modelId]);

  function handleSave() {
    if (!name.trim()) {
      setError('Informe o nome do modelo');
      return;
    }
    if (editing && modelId != null) {
      renameModel(modelId, name);
      router.back();
      return;
    }
    const id = createModel(name, base === 'generica' ? 'template' : 'manual');
    if (base === 'generica') applyTemplate('generica', { replace: false, modelId: id });
    setEditingModelId(id);
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen options={{ title: editing ? 'Renomear modelo' : 'Novo modelo' }} />

      <FormField label="Nome" error={error ?? undefined}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex.: Semana A, Mês de provas"
          placeholderTextColor="#9CA3AF"
          className={INPUT}
        />
      </FormField>

      {!editing && (
        <FormField label="Começar de">
          <View className="flex-row">
            {(['vazio', 'generica'] as Base[]).map((b) => {
              const sel = base === b;
              return (
                <TouchableOpacity
                  key={b}
                  onPress={() => setBase(b)}
                  className={`px-4 py-2 rounded-lg mr-2 border ${
                    sel ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Text className={`text-sm font-medium ${sel ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                    {b === 'vazio' ? 'Vazio' : 'Rotina genérica'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FormField>
      )}

      <TouchableOpacity onPress={handleSave} className="bg-blue-600 rounded-lg py-3 items-center mt-2">
        <Text className="text-white font-semibold">{editing ? 'Salvar' : 'Criar e editar'}</Text>
      </TouchableOpacity>

      {!editing && (
        <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-3 px-1 leading-4">
          O novo modelo vira o modelo em edição. Você também pode duplicar um existente ou importar por IA na lista de modelos.
        </Text>
      )}
    </ScrollView>
  );
}
