import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CategoryPicker } from '@/components/CategoryPicker';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DateField } from '@/components/DateField';
import { FormField } from '@/components/FormField';
import { PriorityPicker } from '@/components/PriorityPicker';
import { TimeInput } from '@/components/TimeInput';
import { toIsoDate } from '@/lib/dayResolver';
import { computeDuration, formatDuration, validateEvent } from '@/lib/validation';
import { getAllCategories } from '@/repositories/categoriesRepo';
import {
  createEvent,
  deleteEvent,
  getEventById,
  updateEvent,
} from '@/repositories/eventsRepo';

const INPUT =
  'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800';

export default function EventoForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const eventId = params.id ? Number(params.id) : null;
  const editing = eventId != null;

  const categories = useMemo(() => getAllCategories(), []);

  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [priority, setPriority] = useState('Média');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (eventId == null) return;
    const e = getEventById(eventId);
    if (e) {
      setDate(e.date);
      setStart(e.start);
      setEnd(e.end);
      setTitle(e.title);
      setCategoryId(e.categoryId);
      setPriority(e.priority ?? 'Média');
    }
  }, [eventId]);

  const duration = computeDuration(start, end);

  function handleSave() {
    const input = { date, start, end, title, categoryId, priority };
    const result = validateEvent(input);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (editing && eventId != null) updateEvent(eventId, input);
    else createEvent(input);
    router.back();
  }

  function handleDelete() {
    if (eventId != null) deleteEvent(eventId);
    setConfirmDelete(false);
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen options={{ title: editing ? 'Editar compromisso' : 'Novo compromisso' }} />

      <FormField label="Título" error={errors.title}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ex.: Dentista"
          placeholderTextColor="#9CA3AF"
          className={INPUT}
        />
      </FormField>

      <FormField label="Data" error={errors.date}>
        <DateField value={date} onChange={setDate} />
      </FormField>

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
      </Text>

      <FormField label="Categoria" error={errors.categoryId}>
        <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
      </FormField>

      <FormField label="Prioridade">
        <PriorityPicker value={priority} onChange={setPriority} />
      </FormField>

      <TouchableOpacity onPress={handleSave} className="bg-blue-600 rounded-lg py-3 items-center mt-2">
        <Text className="text-white font-semibold">Salvar</Text>
      </TouchableOpacity>

      {editing && (
        <TouchableOpacity onPress={() => setConfirmDelete(true)} className="py-3 items-center mt-1">
          <Text className="text-red-500 font-medium">Excluir compromisso</Text>
        </TouchableOpacity>
      )}

      <ConfirmDialog
        visible={confirmDelete}
        title="Excluir compromisso?"
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </ScrollView>
  );
}
