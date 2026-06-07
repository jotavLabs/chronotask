import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CategoryPicker } from '@/components/CategoryPicker';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormField } from '@/components/FormField';
import { formatDuration, validateMonthly } from '@/lib/validation';
import { getAllCategories } from '@/repositories/categoriesRepo';
import {
  createMonthly,
  deleteMonthly,
  getMonthlyById,
  updateMonthly,
} from '@/repositories/monthlyRoutinesRepo';

const INPUT =
  'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800';

export default function MensalForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const monthlyId = params.id ? Number(params.id) : null;
  const editing = monthlyId != null;

  const categories = useMemo(() => getAllCategories(), []);

  const [name, setName] = useState('');
  const [startDay, setStartDay] = useState('1');
  const [endDay, setEndDay] = useState('31');
  const [duration, setDuration] = useState('30');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [suggested, setSuggested] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (monthlyId == null) return;
    const m = getMonthlyById(monthlyId);
    if (m) {
      setName(m.name);
      setStartDay(String(m.windowStartDay));
      setEndDay(String(m.windowEndDay));
      setDuration(String(m.durationMin));
      setCategoryId(m.categoryId);
      setSuggested(m.suggestedBlock ?? '');
    }
  }, [monthlyId]);

  const durationMin = parseInt(duration, 10);

  function handleSave() {
    const input = {
      name,
      windowStartDay: parseInt(startDay, 10),
      windowEndDay: parseInt(endDay, 10),
      durationMin,
      categoryId,
      suggestedBlock: suggested,
    };
    const result = validateMonthly(input);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (editing && monthlyId != null) updateMonthly(monthlyId, input);
    else createMonthly(input);
    router.back();
  }

  function handleDelete() {
    if (monthlyId != null) deleteMonthly(monthlyId);
    setConfirmDelete(false);
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen options={{ title: editing ? 'Editar rotina mensal' : 'Nova rotina mensal' }} />

      <FormField label="Nome" error={errors.name}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex.: Cortar cabelo"
          placeholderTextColor="#9CA3AF"
          className={INPUT}
        />
      </FormField>

      <View className="flex-row">
        <View className="flex-1 mr-2">
          <FormField label="Janela: dia início" error={errors.windowStartDay}>
            <TextInput
              value={startDay}
              onChangeText={(t) => setStartDay(t.replace(/\D/g, '').slice(0, 2))}
              keyboardType="number-pad"
              maxLength={2}
              className={INPUT}
            />
          </FormField>
        </View>
        <View className="flex-1 ml-2">
          <FormField label="Janela: dia fim" error={errors.windowEndDay}>
            <TextInput
              value={endDay}
              onChangeText={(t) => setEndDay(t.replace(/\D/g, '').slice(0, 2))}
              keyboardType="number-pad"
              maxLength={2}
              className={INPUT}
            />
          </FormField>
        </View>
      </View>

      <FormField label="Duração (min)" error={errors.durationMin}>
        <TextInput
          value={duration}
          onChangeText={(t) => setDuration(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          className={INPUT}
        />
      </FormField>
      <Text className="text-xs text-gray-400 dark:text-gray-500 -mt-2 mb-4">
        {Number.isFinite(durationMin) && durationMin > 0 ? formatDuration(durationMin) : ' '}
      </Text>

      <FormField label="Categoria" error={errors.categoryId}>
        <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
      </FormField>

      <FormField label="Bloco sugerido (opcional)">
        <TextInput
          value={suggested}
          onChangeText={setSuggested}
          placeholder="Ex.: encaixar à tarde"
          placeholderTextColor="#9CA3AF"
          className={INPUT}
        />
      </FormField>

      <TouchableOpacity onPress={handleSave} className="bg-blue-600 rounded-lg py-3 items-center mt-2">
        <Text className="text-white font-semibold">Salvar</Text>
      </TouchableOpacity>

      {editing && (
        <TouchableOpacity onPress={() => setConfirmDelete(true)} className="py-3 items-center mt-1">
          <Text className="text-red-500 font-medium">Excluir rotina mensal</Text>
        </TouchableOpacity>
      )}

      <ConfirmDialog
        visible={confirmDelete}
        title="Excluir rotina mensal?"
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </ScrollView>
  );
}
