import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toIsoDate } from '@/lib/dayResolver';
import { getDatesWithExtras } from '@/repositories/adaptedDayRepo';
import { buildHolidayDateSet } from '@/repositories/categoriesRepo';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
/** Monday-first weekday offset (Mon=0 … Sun=6), matching the rest of the app. */
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

export default function MesScreen() {
  const today = useMemo(() => new Date(), []);
  const todayIso = toIsoDate(today);
  const holidays = useMemo(() => buildHolidayDateSet(), []);
  const [month, setMonth] = useState<Date>(() => startOfMonth(today));
  const [extras, setExtras] = useState<Set<string>>(new Set());

  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const lead = mondayIndex(first);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(month.getFullYear(), month.getMonth(), d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      const isos = cells.filter((c): c is Date => c != null).map(toIsoDate);
      setExtras(getDatesWithExtras(isos));
    }, [cells]),
  );

  const shiftMonth = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const isCurrentMonth =
    month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear();

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['bottom']}>
      <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
        <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={10} className="px-2">
          <Text className="text-2xl text-blue-600">‹</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-900 dark:text-white">
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </Text>
        <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={10} className="px-2">
          <Text className="text-2xl text-blue-600">›</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row px-2">
        {WEEKDAYS.map((w) => (
          <View key={w} className="flex-1 items-center py-1">
            <Text className="text-[11px] font-medium text-gray-400 dark:text-gray-500">{w}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap px-2">
        {cells.map((c, i) => {
          if (!c) return <View key={`b${i}`} style={{ width: `${100 / 7}%` }} className="h-14" />;
          const iso = toIsoDate(c);
          const isToday = iso === todayIso;
          const hasExtras = extras.has(iso);
          const isHoliday = holidays.has(iso);
          return (
            <TouchableOpacity
              key={iso}
              style={{ width: `${100 / 7}%` }}
              className="h-14 items-center justify-center"
              onPress={() => router.navigate({ pathname: '/', params: { date: iso } })}
            >
              <View className={`w-9 h-9 items-center justify-center rounded-full ${isToday ? 'bg-blue-600' : ''}`}>
                <Text
                  className={`text-sm ${
                    isToday
                      ? 'text-white font-bold'
                      : isHoliday
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-800 dark:text-gray-100'
                  }`}
                >
                  {c.getDate()}
                </Text>
              </View>
              <View className="flex-row mt-0.5 h-1.5">
                {hasExtras && <View className="w-1.5 h-1.5 rounded-full bg-orange-500 mx-0.5" />}
                {isHoliday && <View className="w-1.5 h-1.5 rounded-full bg-yellow-400 mx-0.5" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {!isCurrentMonth && (
        <View className="items-center mt-3">
          <TouchableOpacity onPress={() => setMonth(startOfMonth(today))} hitSlop={6}>
            <Text className="text-xs text-blue-600">voltar para o mês atual</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
