import { router, useFocusEffect } from 'expo-router';
import type { Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DraggableList } from '@/components/DraggableList';
import type { Exercise, TrainingDay } from '@/db/schema';
import {
  deleteExercise,
  deleteTrainingDay,
  getExercisesForDay,
  getTrainingDays,
  reorderExercises,
} from '@/repositories/trainingRepo';

export default function TreinosScreen() {
  const [days, setDays] = useState<TrainingDay[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [pendingEx, setPendingEx] = useState<number | null>(null);
  const [pendingDay, setPendingDay] = useState<number | null>(null);

  const load = useCallback(() => {
    const ds = getTrainingDays();
    setDays(ds);
    setSelectedId((cur) => (cur != null && ds.some((d) => d.id === cur) ? cur : (ds[0]?.id ?? null)));
  }, []);
  useFocusEffect(load);

  const selectedId2 = selectedId != null && days.some((d) => d.id === selectedId) ? selectedId : (days[0]?.id ?? null);

  const reloadExercises = useCallback(() => {
    setExercises(selectedId2 != null ? getExercisesForDay(selectedId2) : []);
  }, [selectedId2]);
  useFocusEffect(reloadExercises);

  const selectedDay = days.find((d) => d.id === selectedId2) ?? null;

  function onReorder(ids: number[]) {
    reorderExercises(ids);
    reloadExercises();
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* day selector */}
      <View className="pt-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {days.map((d) => {
            const sel = d.id === selectedId2;
            return (
              <TouchableOpacity
                key={d.id}
                onPress={() => setSelectedId(d.id)}
                className={`px-3 py-1.5 rounded-full mr-2 border ${
                  sel ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <Text className={`text-xs font-medium ${sel ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => router.push('/gerenciar/treino-dia-form' as Href)}
            className="px-3 py-1.5 rounded-full mr-2 border border-dashed border-gray-400 dark:border-gray-500"
          >
            <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">＋ Novo dia</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {selectedDay ? (
        <>
          <View className="flex-row items-center justify-between px-4 py-2">
            <Text className="text-sm text-gray-500 dark:text-gray-400">{selectedDay.weekday}</Text>
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => router.push(`/gerenciar/treino-dia-form?id=${selectedDay.id}` as Href)}
                hitSlop={8}
                className="px-2"
              >
                <Text className="text-blue-600 dark:text-blue-400 text-xs font-semibold">Editar dia</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPendingDay(selectedDay.id)} hitSlop={8} className="px-2">
                <Text className="text-red-500 text-xs font-semibold">Excluir dia</Text>
              </TouchableOpacity>
            </View>
          </View>

          {exercises.length === 0 ? (
            <View className="items-center py-16">
              <Text className="text-sm text-gray-400">Nenhum exercício neste dia</Text>
            </View>
          ) : (
            <DraggableList
              items={exercises}
              getId={(e) => e.id}
              getAccent={() => '#EF4444'}
              onReorder={onReorder}
              renderContent={(e) => (
                <View className="flex-row items-center">
                  <TouchableOpacity
                    className="flex-1 px-1"
                    onPress={() => router.push(`/gerenciar/exercicio-form?id=${e.id}` as Href)}
                  >
                    <Text className="text-sm font-medium text-gray-800 dark:text-gray-100" numberOfLines={1}>
                      {e.name}
                    </Text>
                    <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5" numberOfLines={1}>
                      {[e.sets && e.reps ? `${e.sets}×${e.reps}` : e.sets || e.reps, e.rest ? `descanso ${e.rest}` : null, e.type]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setPendingEx(e.id)} hitSlop={8} className="px-2">
                    <Text className="text-base">🗑️</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </>
      ) : (
        <View className="items-center py-20 px-8">
          <Text className="text-4xl mb-3">💪</Text>
          <Text className="text-base font-semibold text-gray-800 dark:text-gray-100">Nenhum dia de treino</Text>
          <Text className="text-sm text-gray-400 dark:text-gray-500 mt-1 text-center">
            Crie um dia de treino para adicionar exercícios.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/gerenciar/treino-dia-form' as Href)}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600"
          >
            <Text className="text-sm font-semibold text-white">Criar dia de treino</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedDay && (
        <TouchableOpacity
          onPress={() => router.push(`/gerenciar/exercicio-form?dayId=${selectedDay.id}` as Href)}
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 items-center justify-center shadow-lg"
          style={{ elevation: 4 }}
        >
          <Text className="text-white text-3xl -mt-0.5">+</Text>
        </TouchableOpacity>
      )}

      <ConfirmDialog
        visible={pendingEx != null}
        title="Excluir exercício?"
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (pendingEx != null) deleteExercise(pendingEx);
          setPendingEx(null);
          reloadExercises();
        }}
        onCancel={() => setPendingEx(null)}
      />

      <ConfirmDialog
        visible={pendingDay != null}
        title="Excluir dia de treino?"
        message="Os exercícios deste dia também serão removidos."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (pendingDay != null) deleteTrainingDay(pendingDay);
          setPendingDay(null);
          setSelectedId(null);
          load();
        }}
        onCancel={() => setPendingDay(null)}
      />
    </View>
  );
}
