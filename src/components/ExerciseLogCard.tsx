import { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { Exercise } from '@/db/schema';
import { getLastSession, getLogsForDate, logSet } from '@/repositories/trainingRepo';

interface Props {
  exercise: Exercise;
  date: string; // ISO
  color: string;
}

const INPUT =
  'w-12 h-10 text-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white bg-white dark:bg-gray-800';

export function ExerciseLogCard({ exercise, date, color }: Props) {
  const numSets = useMemo(() => {
    const n = parseInt(exercise.sets ?? '', 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 8) : 4;
  }, [exercise.sets]);
  const isHold = exercise.type === 'isometria' || /hold|seg/i.test(exercise.reps ?? '');

  const [values, setValues] = useState<string[]>(() => Array(numSets).fill(''));
  const [last, setLast] = useState<{ date: string; values: number[] } | null>(null);
  const [showLadder, setShowLadder] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const logs = getLogsForDate(exercise.id, date);
    const arr = Array(numSets).fill('');
    for (const l of logs) {
      if (l.setNumber >= 1 && l.setNumber <= numSets) {
        const v = l.reps ?? l.holdSeconds;
        arr[l.setNumber - 1] = v != null ? String(v) : '';
      }
    }
    setValues(arr);
    setLast(getLastSession(exercise.id, date));
  }, [exercise.id, date, numSets]);

  function setAt(i: number, v: string) {
    setValues((prev) => prev.map((x, idx) => (idx === i ? v.replace(/\D/g, '') : x)));
  }

  function save() {
    values.forEach((v, i) => {
      const n = parseInt(v, 10);
      if (Number.isFinite(n)) logSet(exercise.id, date, i + 1, isHold ? { holdSeconds: n } : { reps: n });
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <View
      className="bg-white dark:bg-gray-800 rounded-xl p-3 mb-2 mx-3"
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <View className="flex-row items-start justify-between">
        <Text className="text-sm font-semibold text-gray-900 dark:text-white flex-1 mr-2">{exercise.name}</Text>
        {exercise.type ? (
          <View className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
            <Text className="text-[10px] font-medium text-gray-600 dark:text-gray-300">{exercise.type}</Text>
          </View>
        ) : null}
      </View>

      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {exercise.sets}×{exercise.reps} · descanso {exercise.rest}
      </Text>

      {exercise.ladder ? (
        <TouchableOpacity onPress={() => setShowLadder((s) => !s)} className="mt-1">
          <Text className="text-xs text-blue-600 dark:text-blue-400">
            {showLadder ? '▾ Escada de progressão' : '▸ Escada de progressão'}
          </Text>
          {showLadder && (
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-4">{exercise.ladder}</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {/* set inputs */}
      <View className="flex-row flex-wrap items-center mt-3">
        {values.map((v, i) => (
          <View key={i} className="items-center mr-2 mb-1">
            <Text className="text-[10px] text-gray-400 mb-0.5">{i + 1}</Text>
            <TextInput
              value={v}
              onChangeText={(t) => setAt(i, t)}
              keyboardType="number-pad"
              maxLength={3}
              placeholder={isHold ? 's' : '–'}
              placeholderTextColor="#9CA3AF"
              className={INPUT}
            />
          </View>
        ))}
        <TouchableOpacity onPress={save} className="px-3 h-10 rounded-lg bg-blue-600 items-center justify-center mb-1 ml-1">
          <Text className="text-xs font-semibold text-white">{saved ? '✓' : 'Salvar'}</Text>
        </TouchableOpacity>
      </View>

      {last && last.values.length > 0 ? (
        <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
          última vez ({last.date.slice(5)}): {last.values.join(', ')}
          {isHold ? ' s' : ''}
        </Text>
      ) : null}
    </View>
  );
}
