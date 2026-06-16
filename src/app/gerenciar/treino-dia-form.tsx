import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity } from 'react-native';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DayPicker } from '@/components/DayPicker';
import { FormField } from '@/components/FormField';
import type { DayLabel } from '@/lib/dayResolver';
import {
  createTrainingDay,
  deleteTrainingDay,
  getTrainingDayById,
  updateTrainingDay,
} from '@/repositories/trainingRepo';

const INPUT =
  'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800';

export default function TreinoDiaForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const dayId = params.id ? Number(params.id) : null;
  const editing = dayId != null;

  const [label, setLabel] = useState('');
  const [weekday, setWeekday] = useState<DayLabel>('Seg');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (dayId == null) return;
    const d = getTrainingDayById(dayId);
    if (d) {
      setLabel(d.label);
      setWeekday(d.weekday as DayLabel);
    }
  }, [dayId]);

  function handleSave() {
    if (!label.trim()) {
      setError('Informe o nome do treino');
      return;
    }
    const input = { label, weekday };
    if (editing && dayId != null) updateTrainingDay(dayId, input);
    else createTrainingDay(input);
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen options={{ title: editing ? 'Editar dia de treino' : 'Novo dia de treino' }} />

      <FormField label="Nome" error={error ?? undefined}>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="Ex.: Treino A (superiores)"
          placeholderTextColor="#9CA3AF"
          className={INPUT}
        />
      </FormField>

      <FormField label="Dia da semana">
        <DayPicker value={weekday} onChange={setWeekday} />
      </FormField>

      <TouchableOpacity onPress={handleSave} className="bg-blue-600 rounded-lg py-3 items-center mt-2">
        <Text className="text-white font-semibold">Salvar</Text>
      </TouchableOpacity>

      {editing && (
        <TouchableOpacity onPress={() => setConfirmDelete(true)} className="py-3 items-center mt-1">
          <Text className="text-red-500 font-medium">Excluir dia de treino</Text>
        </TouchableOpacity>
      )}

      <ConfirmDialog
        visible={confirmDelete}
        title="Excluir dia de treino?"
        message="Os exercícios deste dia também serão removidos."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (dayId != null) deleteTrainingDay(dayId);
          setConfirmDelete(false);
          router.back();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </ScrollView>
  );
}
