import { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExerciseLogCard } from '@/components/ExerciseLogCard';
import type { Exercise } from '@/db/schema';
import { toIsoDate } from '@/lib/dayResolver';
import { categoryColorFor } from '@/lib/theme';
import { trainingForDate, weekdayKey } from '@/lib/trainingResolver';
import { useTheme } from '@/hooks/useTheme';
import {
  getAllTrainingWithExercises,
  getExercisesForDay,
  getTrainingDays,
} from '@/repositories/trainingRepo';

function Segmented({ tab, onChange }: { tab: 'hoje' | 'semana'; onChange: (t: 'hoje' | 'semana') => void }) {
  return (
    <View className="flex-row bg-gray-200 dark:bg-gray-800 rounded-lg p-0.5 mx-4 mt-3">
      {(['hoje', 'semana'] as const).map((t) => (
        <TouchableOpacity
          key={t}
          onPress={() => onChange(t)}
          className={`flex-1 py-1.5 rounded-md items-center ${tab === t ? 'bg-white dark:bg-gray-700' : ''}`}
        >
          <Text className={`text-sm font-medium ${tab === t ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            {t === 'hoje' ? 'Hoje' : 'Semana'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ExerciseRow({ ex }: { ex: Exercise }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">
      <View className="flex-row items-start justify-between">
        <Text className="text-sm text-gray-800 dark:text-gray-100 flex-1 mr-2">{ex.name}</Text>
        {ex.type ? (
          <Text className="text-[10px] text-gray-400 dark:text-gray-500">{ex.type}</Text>
        ) : null}
      </View>
      <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
        {ex.sets}×{ex.reps} · descanso {ex.rest}
      </Text>
      {ex.ladder ? (
        <TouchableOpacity onPress={() => setOpen((s) => !s)}>
          <Text className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            {open ? '▾ escada' : '▸ escada'}
          </Text>
          {open && <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-4">{ex.ladder}</Text>}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function TreinoScreen() {
  const { scheme } = useTheme();
  const color = categoryColorFor('#EF4444', scheme); // Treino accent
  const today = useMemo(() => new Date(), []);
  const iso = toIsoDate(today);
  const [tab, setTab] = useState<'hoje' | 'semana'>('hoje');

  const days = useMemo(() => getTrainingDays(), []);
  const todayTraining = useMemo(() => trainingForDate(today, days), [today, days]);
  const todayExercises = useMemo(
    () => (todayTraining ? getExercisesForDay(todayTraining.id) : []),
    [todayTraining],
  );
  const week = useMemo(() => getAllTrainingWithExercises(), []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['bottom']}>
      <Segmented tab={tab} onChange={setTab} />

      {tab === 'hoje' ? (
        todayTraining ? (
          <ScrollView contentContainerStyle={{ paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
            <View className="px-4 pb-2">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">{todayTraining.label}</Text>
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                {weekdayKey(today)} · {todayExercises.length} exercícios · registre suas séries
              </Text>
            </View>
            {todayExercises.map((ex) => (
              <ExerciseLogCard key={ex.id} exercise={ex} date={iso} color={color} />
            ))}
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-4xl mb-3">🛌</Text>
            <Text className="text-base font-semibold text-gray-800 dark:text-gray-100">Sem treino hoje</Text>
            <Text className="text-sm text-gray-400 dark:text-gray-500 mt-1 text-center">
              Dia de descanso. Veja a semana para se preparar.
            </Text>
            <TouchableOpacity onPress={() => setTab('semana')} className="mt-4 px-4 py-2 rounded-lg bg-blue-600">
              <Text className="text-sm font-semibold text-white">Ver a semana</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
          {week.map(({ day, exercises }) => (
            <View key={day.id} className="mb-3">
              <View className="px-4 py-1 flex-row items-center justify-between">
                <Text className="text-base font-bold text-gray-900 dark:text-white">{day.label}</Text>
                <Text className="text-xs text-gray-400 dark:text-gray-500">{day.weekday}</Text>
              </View>
              <View className="bg-white dark:bg-gray-800 rounded-xl mx-3" style={{ borderLeftWidth: 3, borderLeftColor: color }}>
                {exercises.map((ex) => (
                  <ExerciseRow key={ex.id} ex={ex} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
