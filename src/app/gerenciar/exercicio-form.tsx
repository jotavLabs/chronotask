import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormField } from '@/components/FormField';
import {
  createExercise,
  deleteExercise,
  getExerciseById,
  updateExercise,
} from '@/repositories/trainingRepo';

const INPUT =
  'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800';

export default function ExercicioForm() {
  const params = useLocalSearchParams<{ id?: string; dayId?: string }>();
  const exId = params.id ? Number(params.id) : null;
  const editing = exId != null;

  const [trainingDayId, setTrainingDayId] = useState<number | null>(params.dayId ? Number(params.dayId) : null);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [rest, setRest] = useState('');
  const [ladder, setLadder] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (exId == null) return;
    const e = getExerciseById(exId);
    if (e) {
      setTrainingDayId(e.trainingDayId);
      setName(e.name);
      setType(e.type ?? '');
      setSets(e.sets ?? '');
      setReps(e.reps ?? '');
      setRest(e.rest ?? '');
      setLadder(e.ladder ?? '');
      setNote(e.note ?? '');
    }
  }, [exId]);

  function handleSave() {
    if (!name.trim()) {
      setError('Informe o nome do exercício');
      return;
    }
    if (trainingDayId == null) {
      setError('Dia de treino inválido');
      return;
    }
    const input = { trainingDayId, name, type, sets, reps, rest, ladder, note };
    if (editing && exId != null) updateExercise(exId, input);
    else createExercise(input);
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen options={{ title: editing ? 'Editar exercício' : 'Novo exercício' }} />

      <FormField label="Nome" error={error ?? undefined}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex.: Flexão / Agachamento"
          placeholderTextColor="#9CA3AF"
          className={INPUT}
        />
      </FormField>

      <FormField label="Tipo (opcional)">
        <TextInput
          value={type}
          onChangeText={setType}
          placeholder="força · isometria · acessório · core"
          placeholderTextColor="#9CA3AF"
          className={INPUT}
        />
      </FormField>

      <View className="flex-row">
        <View className="flex-1 mr-2">
          <FormField label="Séries">
            <TextInput value={sets} onChangeText={setSets} placeholder="Ex.: 4" placeholderTextColor="#9CA3AF" className={INPUT} />
          </FormField>
        </View>
        <View className="flex-1 mx-1">
          <FormField label="Reps">
            <TextInput value={reps} onChangeText={setReps} placeholder="Ex.: 8–12" placeholderTextColor="#9CA3AF" className={INPUT} />
          </FormField>
        </View>
        <View className="flex-1 ml-2">
          <FormField label="Descanso">
            <TextInput value={rest} onChangeText={setRest} placeholder="Ex.: 2 min" placeholderTextColor="#9CA3AF" className={INPUT} />
          </FormField>
        </View>
      </View>

      <FormField label="Progressão / escada (opcional)">
        <TextInput
          value={ladder}
          onChangeText={setLadder}
          placeholder="Ex.: assistido → completo → com peso"
          placeholderTextColor="#9CA3AF"
          className={INPUT}
        />
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

      <TouchableOpacity onPress={handleSave} className="bg-blue-600 rounded-lg py-3 items-center mt-2">
        <Text className="text-white font-semibold">Salvar</Text>
      </TouchableOpacity>

      {editing && (
        <TouchableOpacity onPress={() => setConfirmDelete(true)} className="py-3 items-center mt-1">
          <Text className="text-red-500 font-medium">Excluir exercício</Text>
        </TouchableOpacity>
      )}

      <ConfirmDialog
        visible={confirmDelete}
        title="Excluir exercício?"
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (exId != null) deleteExercise(exId);
          setConfirmDelete(false);
          router.back();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </ScrollView>
  );
}
