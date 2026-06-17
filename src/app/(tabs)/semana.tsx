import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DayList } from '@/components/DayList';
import { DraggableList } from '@/components/DraggableList';
import { resolveDayLabel, getWeekDates, shortWeekdayPt, toIsoDate } from '@/lib/dayResolver';
import { formatDuration } from '@/lib/validation';
import { getDatesWithExtras } from '@/repositories/adaptedDayRepo';
import { applyReorder } from '@/repositories/blocksRepo';
import { buildHolidayDateSet } from '@/repositories/categoriesRepo';
import { getModelIdForDate } from '@/repositories/schedulingRepo';
import { useRoutineStore } from '@/store/routineStore';

export default function SemanaScreen() {
  const today = useMemo(() => new Date(), []);
  const weekDates = useMemo(() => getWeekDates(today), [today]);
  const holidayDates = useMemo(() => buildHolidayDateSet(), []);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const selectedIso = toIsoDate(selectedDate);
  const selectedLabel = resolveDayLabel(selectedDate);
  const selectedIsHoliday = holidayDates.has(selectedIso);

  const { days, dates, loadDay, loadDoneForDate, toggleBlock } = useRoutineStore();
  const [extras, setExtras] = useState<Set<string>>(new Set());
  const [reordering, setReordering] = useState(false);

  function onReorderDay(ids: number[]) {
    const modelId = getModelIdForDate(selectedDate);
    applyReorder(selectedLabel, ids, modelId);
    loadDay(selectedLabel, modelId);
    setExtras(getDatesWithExtras(weekDates.map(toIsoDate)));
  }

  // Load blocks for all 7 days; refetch on focus so edits show up here.
  useFocusEffect(
    useCallback(() => {
      for (const d of weekDates) {
        const label = resolveDayLabel(d);
        loadDay(label, getModelIdForDate(d));
        loadDoneForDate(toIsoDate(d));
      }
      setExtras(getDatesWithExtras(weekDates.map(toIsoDate)));
    }, [weekDates, holidayDates]),
  );

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
            const label = resolveDayLabel(d);
            const isFeriado = holidayDates.has(iso);
            const dayBlocks = days[label]?.blocks ?? [];
            const dayDone = dates[iso] ?? new Set<number>();
            const allDone = dayBlocks.length > 0 && dayBlocks.every((b) => dayDone.has(b.id));
            const hasExtras = extras.has(iso);

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
                <View className="flex-row gap-0.5 mt-0.5 h-1.5">
                  {isFeriado && <View className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                  {hasExtras && <View className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                  {allDone && <View className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Selected day header */}
      <View className="px-4 py-3 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 capitalize">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </Text>
          {selectedIsHoliday && (
            <Text className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">Feriado</Text>
          )}
        </View>
        <View className="flex-row items-center">
          {blocks.length > 0 && (
            <TouchableOpacity
              onPress={() => setReordering((r) => !r)}
              className={`px-3 py-1.5 rounded-full mr-2 ${reordering ? 'bg-blue-600' : 'bg-gray-100 dark:bg-gray-800'}`}
            >
              <Text className={`text-xs font-semibold ${reordering ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                {reordering ? '✓ Concluir' : '↕ Reordenar'}
              </Text>
            </TouchableOpacity>
          )}
          {(extras.has(selectedIso) || selectedIsHoliday) && !reordering && (
            <TouchableOpacity
              onPress={() => router.navigate({ pathname: '/', params: { date: selectedIso } })}
              className="px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/40"
            >
              <Text className="text-xs font-semibold text-orange-700 dark:text-orange-300">Ver dia adaptado →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {reordering ? (
        <DraggableList
          items={blocks}
          getId={(b) => b.id}
          getAccent={(b) => b.categoryColor ?? '#6B7280'}
          onReorder={onReorderDay}
          renderContent={(b) => (
            <TouchableOpacity
              className="flex-1 px-1"
              onPress={() => router.push({ pathname: '/gerenciar/bloco-form', params: { id: String(b.id) } })}
            >
              <Text className="text-sm font-medium text-gray-800 dark:text-gray-100" numberOfLines={1}>
                {b.activity}
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5" numberOfLines={1}>
                {b.start}–{b.end} · {formatDuration(b.durationMin)}
                {b.categoryName ? ` · ${b.categoryName}` : ''}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <DayList
          isoDate={selectedIso}
          blocks={blocks}
          doneIds={doneIds}
          onToggle={(blockId) => toggleBlock(selectedIso, blockId)}
          onPressBlock={(id) =>
            router.push({ pathname: '/gerenciar/bloco-form', params: { id: String(id) } })
          }
        />
      )}
    </SafeAreaView>
  );
}
