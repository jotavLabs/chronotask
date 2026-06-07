import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DayList } from '@/components/DayList';
import { resolveDayLabel, toIsoDate } from '@/lib/dayResolver';
import { getHolidayNamePure } from '@/lib/holidays';
import { buildHolidayDateSet, buildHolidayMap } from '@/repositories/categoriesRepo';
import { useRoutineStore } from '@/store/routineStore';

export default function HojeScreen() {
  const today = useMemo(() => new Date(), []);
  const isoDate = toIsoDate(today);

  const holidayDates = useMemo(() => buildHolidayDateSet(), []);
  const dayLabel = useMemo(() => resolveDayLabel(today, holidayDates), [today, holidayDates]);

  const { days, dates, loadDay, loadDoneForDate, toggleBlock } = useRoutineStore();

  useEffect(() => {
    loadDay(dayLabel);
    loadDoneForDate(isoDate);
  }, [dayLabel, isoDate]);

  const blocks = days[dayLabel]?.blocks ?? [];
  const doneIds = dates[isoDate] ?? new Set<number>();

  const holidayMap = useMemo(() => buildHolidayMap(), []);
  const isHoliday = dayLabel === 'Feriado';
  const holidayName = isHoliday ? getHolidayNamePure(isoDate, holidayMap) : null;

  const dateLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });
  const doneCount = blocks.filter((b) => doneIds.has(b.id)).length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['bottom']}>
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-900 dark:text-white capitalize">{dateLabel}</Text>
        <View className="flex-row items-center mt-1 gap-2">
          <View
            className="px-2 py-0.5 rounded-full"
            style={{ backgroundColor: isHoliday ? '#FEF3C7' : '#DBEAFE' }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: isHoliday ? '#92400E' : '#1E40AF' }}
            >
              {isHoliday ? `Feriado${holidayName ? ` — ${holidayName}` : ''}` : dayLabel}
            </Text>
          </View>
          {blocks.length > 0 && (
            <Text className="text-xs text-gray-400 dark:text-gray-500">
              {doneCount}/{blocks.length} concluídos
            </Text>
          )}
        </View>
      </View>

      <DayList
        isoDate={isoDate}
        blocks={blocks}
        doneIds={doneIds}
        onToggle={(blockId) => toggleBlock(isoDate, blockId)}
      />
    </SafeAreaView>
  );
}
