import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CategoryPicker } from '@/components/CategoryPicker';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DayPicker, MultiDayPicker } from '@/components/DayPicker';
import { FormField } from '@/components/FormField';
import { TimeInput } from '@/components/TimeInput';
import type { DayLabel } from '@/lib/dayResolver';
import { computeDuration, formatDuration, timeToMinutes, validateBlock } from '@/lib/validation';
import {
  createBlock,
  deleteBlock,
  getBlockById,
  updateBlock,
} from '@/repositories/blocksRepo';
import { getAllCategories } from '@/repositories/categoriesRepo';

const INPUT =
  'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800';

export default function BlocoForm() {
  const params = useLocalSearchParams<{ id?: string; dayLabel?: string; cat?: string }>();
  const blockId = params.id ? Number(params.id) : null;
  const editing = blockId != null;

  const categories = useMemo(() => getAllCategories(), []);

  const [dayLabel, setDayLabel] = useState<DayLabel>((params.dayLabel as DayLabel) ?? 'Seg');
  const [days, setDays] = useState<DayLabel[]>([(params.dayLabel as DayLabel) ?? 'Seg']);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [activity, setActivity] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [important, setImportant] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (blockId == null) return;
    const b = getBlockById(blockId);
    if (b) {
      setDayLabel(b.dayLabel as DayLabel);
      setStart(b.start);
      setEnd(b.end);
      setActivity(b.activity);
      setCategoryId(b.categoryId);
      setNote(b.note ?? '');
      setImportant(b.important === 1);
    }
  }, [blockId]);

  // preset category for new blocks created from a specific tab (e.g. Estudos)
  useEffect(() => {
    if (blockId != null || !params.cat) return;
    const c = categories.find((x) => x.name === params.cat);
    if (c) setCategoryId(c.id);
  }, [blockId, params.cat, categories]);

  const duration = computeDuration(start, end);
  const sMin = timeToMinutes(start);
  const eMin = timeToMinutes(end);
  const wraps = sMin != null && eMin != null && eMin <= sMin;

  function toggleDay(d: DayLabel) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function handleSave() {
    if (editing && blockId != null) {
      const input = { dayLabel, start, end, activity, categoryId, note, important: important ? 1 : 0 };
      const result = validateBlock(input);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      updateBlock(blockId, input);
      router.back();
      return;
    }
    // create: one block per selected weekday (same time/activity/category)
    if (days.length === 0) {
      setErrors((e) => ({ ...e, days: 'Selecione ao menos um dia' }));
      return;
    }
    const base = { start, end, activity, categoryId, note, important: important ? 1 : 0 };
    const result = validateBlock(base);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    for (const d of days) createBlock({ ...base, dayLabel: d });
    router.back();
  }

  function handleDelete() {
    if (blockId != null) deleteBlock(blockId);
    setConfirmDelete(false);
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen options={{ title: editing ? 'Editar bloco' : 'Novo bloco' }} />

      {editing ? (
        <FormField label="Dia">
          <DayPicker value={dayLabel} onChange={setDayLabel} />
        </FormField>
      ) : (
        <FormField label="Dias (marque um ou mais)" error={errors.days}>
          <MultiDayPicker value={days} onToggle={toggleDay} />
        </FormField>
      )}

      <View className="flex-row">
        <View className="flex-1 mr-2">
          <FormField label="Início" error={errors.start}>
            <TimeInput value={start} onChange={setStart} />
          </FormField>
        </View>
        <View className="flex-1 ml-2">
          <FormField label="Fim" error={errors.end}>
            <TimeInput value={end} onChange={setEnd} />
          </FormField>
        </View>
      </View>

      <Text className="text-xs text-gray-400 dark:text-gray-500 -mt-2 mb-4">
        Duração: {duration != null ? formatDuration(duration) : '—'}
        {wraps ? ' (vira o dia)' : ''}
      </Text>

      <FormField label="Atividade" error={errors.activity}>
        <TextInput
          value={activity}
          onChangeText={setActivity}
          placeholder="Ex.: Estudo matinal"
          placeholderTextColor="#9CA3AF"
          className={INPUT}
        />
      </FormField>

      <FormField label="Categoria" error={errors.categoryId}>
        <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
      </FormField>

      <FormField label="Observação (opcional)">
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Nota livre"
          placeholderTextColor="#9CA3AF"
          multiline
          className={INPUT}
          style={{ minHeight: 60, textAlignVertical: 'top' }}
        />
      </FormField>

      <View className="flex-row items-center justify-between py-2 mb-2">
        <View className="flex-1 pr-3">
          <Text className="text-sm font-medium text-gray-800 dark:text-gray-100">Importante</Text>
          <Text className="text-xs text-gray-400 dark:text-gray-500">
            Recebe lembrete quando os avisos estão no modo "Importantes"
          </Text>
        </View>
        <Switch value={important} onValueChange={setImportant} />
      </View>

      <TouchableOpacity onPress={handleSave} className="bg-blue-600 rounded-lg py-3 items-center mt-2">
        <Text className="text-white font-semibold">Salvar</Text>
      </TouchableOpacity>

      {editing && (
        <TouchableOpacity onPress={() => setConfirmDelete(true)} className="py-3 items-center mt-1">
          <Text className="text-red-500 font-medium">Excluir bloco</Text>
        </TouchableOpacity>
      )}

      <ConfirmDialog
        visible={confirmDelete}
        title="Excluir bloco?"
        message="As marcações de conclusão deste bloco também serão removidas."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </ScrollView>
  );
}
