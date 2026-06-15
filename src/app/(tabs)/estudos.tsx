import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StudyNoteCard } from '@/components/StudyNoteCard';
import { getWeekDates, resolveDayLabel, shortWeekdayPt, toIsoDate } from '@/lib/dayResolver';
import { categoryColorFor } from '@/lib/theme';
import { useTheme } from '@/hooks/useTheme';
import { getBlocksForDayByCategory } from '@/repositories/blocksRepo';
import type { BlockWithCategory } from '@/repositories/blocksRepo';
import { getDoneBlockIds, setBlockDone } from '@/repositories/completionsRepo';

const CAT = 'Estudo';

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

export default function EstudosScreen() {
  const { scheme } = useTheme();
  const color = categoryColorFor('#10B981', scheme); // Estudo accent
  const today = useMemo(() => new Date(), []);
  const iso = toIsoDate(today);
  const dayLabel = useMemo(() => resolveDayLabel(today), [today]);
  const weekDates = useMemo(() => getWeekDates(today), [today]);

  const [tab, setTab] = useState<'hoje' | 'semana'>('hoje');
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());

  const todayBlocks = useMemo(() => getBlocksForDayByCategory(dayLabel, CAT), [dayLabel]);

  useFocusEffect(
    useCallback(() => {
      setDoneIds(getDoneBlockIds(iso));
    }, [iso]),
  );

  function toggle(blockId: number) {
    const next = !doneIds.has(blockId);
    setBlockDone(iso, blockId, next);
    setDoneIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(blockId);
      else s.delete(blockId);
      return s;
    });
  }

  const week = useMemo(
    () =>
      weekDates.map((d) => {
        const label = resolveDayLabel(d);
        return { date: d, label, blocks: getBlocksForDayByCategory(label, CAT) };
      }),
    [weekDates],
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['bottom']}>
      <Segmented tab={tab} onChange={setTab} />

      {tab === 'hoje' ? (
        <ScrollView contentContainerStyle={{ paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
          <Text className="px-4 pb-1 text-xs text-gray-400 dark:text-gray-500 capitalize">
            {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </Text>
          {todayBlocks.length === 0 ? (
            <View className="items-center py-16">
              <Text className="text-sm text-gray-400">Nenhum bloco de estudo hoje</Text>
            </View>
          ) : (
            todayBlocks.map((b: BlockWithCategory) => (
              <StudyNoteCard
                key={b.id}
                block={b}
                date={iso}
                done={doneIds.has(b.id)}
                onToggle={() => toggle(b.id)}
                color={color}
              />
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
          {week.map(({ date, label, blocks }) => (
            <View key={toIsoDate(date)} className="mb-3">
              <View className="px-4 py-1 flex-row items-center justify-between">
                <Text className="text-base font-bold text-gray-900 dark:text-white">
                  {shortWeekdayPt(date)} {date.getDate()}
                </Text>
                <Text className="text-xs text-gray-400 dark:text-gray-500">{label}</Text>
              </View>
              {blocks.length === 0 ? (
                <Text className="px-4 text-xs text-gray-400 dark:text-gray-500">— sem estudo</Text>
              ) : (
                <View className="bg-white dark:bg-gray-800 rounded-xl mx-3" style={{ borderLeftWidth: 3, borderLeftColor: color }}>
                  {blocks.map((b) => (
                    <View key={b.id} className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">
                      <Text className="text-sm text-gray-800 dark:text-gray-100">{b.activity}</Text>
                      <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {b.start} – {b.end}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
