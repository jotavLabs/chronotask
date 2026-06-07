import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DayList } from '@/components/DayList';
import { resolveDayLabel, getWeekDates, shortWeekdayPt, toIsoDate } from '@/lib/dayResolver';
import { getBlocksForDay } from '@/repositories/blocksRepo';
import { buildHolidayDateSet } from '@/repositories/categoriesRepo';
import { getDoneBlockIds } from '@/repositories/completionsRepo';
import { useRoutineStore } from '@/store/routineStore';

export default function SemanaScreen() {
  const today = useMemo(() => new Date(), []);
  const weekDates = useMemo(() => getWeekDates(today), [today]);
  const holidayDates = useMemo(() => buildHolidayDateSet(), []);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const selectedIso = toIsoDate(selectedDate);
  const selectedLabel = resolveDayLabel(selectedDate, holidayDates);

  const { days, dates, loadDay, loadDoneForDate, toggleBlock } = useRoutineStore();

  // Load blocks for all 7 days upfront
  useEffect(() => {
    for (const d of weekDates) {
      const label = resolveDayLabel(d, holidayDates);
      loadDay(label);
      loadDoneForDate(toIsoDate(d));
    }
  }, []);

  const blocks = days[selectedLabel]?.blocks ?? [];
  const doneIds = dates[selectedIso] ?? new Set<number>();
  const todayIso = toIsoDate(today);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['bottom']}>
      {/* Week strip */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 pt-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
          {weekDates.map((d) => {
            const iso = toIsoDate(d);
            const isSelected = iso === selectedIso;
            const isToday = iso === todayIso;
            const label = resolveDayLabel(d, holidayDates);
            const isFeriado = label === 'Feriado';
            const dayBlocks = days[label]?.blocks ?? [];
            const dayDone = dates[iso] ?? new Set<number>();
            const allDone = dayBlocks.length > 0 && dayBlocks.every((b) => dayDone.has(b.id));

            return (
              <TouchableOpacity
                key={iso}
                onPress={() => setSelectedDate(d)}
                className={`items-center mx-1 px-3 py-2 rounded-xl mb-2 ${
                  isSelected ? 'bg-blue-600' : isToday ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {shortWeekdayPt(d)}
                </Text>
                <Text
                  className={`text-lg font-bold mt-0.5 ${
                    isSelected ? 'text-white' : isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'
                  }`}
                >
                  {d.getDate()}
                </Text>
                {isFeriado && (
                  <View className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-0.5" />
                )}
                {allDone && (
                  <View className="w-1.5 h-1.5 rounded-full bg-green-400 mt-0.5" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Selected day header */}
      <View className="px-4 py-3">
        <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 capitalize">
          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </Text>
        {selectedLabel === 'Feriado' && (
          <Text className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">Feriado</Text>
        )}
      </View>

      <DayList
        isoDate={selectedIso}
        blocks={blocks}
        doneIds={doneIds}
        onToggle={(blockId) => toggleBlock(selectedIso, blockId)}
      />
    </SafeAreaView>
  );
}
