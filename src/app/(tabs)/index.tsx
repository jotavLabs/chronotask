import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdaptedSummary } from '@/components/AdaptedSummary';
import { TimelineRow } from '@/components/TimelineRow';
import type { AdaptedDay } from '@/lib/adaptationEngine';
import { toIsoDate } from '@/lib/dayResolver';
import { loadAdaptedDay } from '@/repositories/adaptedDayRepo';
import { getAllCategories } from '@/repositories/categoriesRepo';
import { useRoutineStore } from '@/store/routineStore';

function parseKey(key: string): { source: string; id: number } {
  const idx = key.indexOf('-');
  return { source: key.slice(0, idx), id: Number(key.slice(idx + 1)) };
}

export default function HojeScreen() {
  const [date, setDate] = useState(() => new Date());
  const [day, setDay] = useState<AdaptedDay | null>(null);
  const { dates, loadDoneForDate, toggleBlock } = useRoutineStore();

  const colorByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of getAllCategories()) if (c.color) m.set(c.name, c.color);
    return m;
  }, []);

  const iso = toIsoDate(date);

  useFocusEffect(
    useCallback(() => {
      setDay(loadAdaptedDay(date));
      loadDoneForDate(iso);
    }, [date, iso]),
  );

  const doneIds = dates[iso] ?? new Set<number>();
  const isToday = iso === toIsoDate(new Date());

  const routineItems = day ? day.timeline.filter((i) => i.source === 'routine' && !i.removed) : [];
  const doneCount = routineItems.filter((i) => doneIds.has(parseKey(i.key).id)).length;

  function shiftDay(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d);
  }

  function openEditor(key: string) {
    const { source, id } = parseKey(key);
    const pathname =
      source === 'event'
        ? '/gerenciar/evento-form'
        : source === 'monthly'
          ? '/gerenciar/mensal-form'
          : '/gerenciar/bloco-form';
    router.push({ pathname, params: { id: String(id) } });
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['bottom']}>
      {/* date selector */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
        <TouchableOpacity onPress={() => shiftDay(-1)} hitSlop={10} className="px-2">
          <Text className="text-2xl text-blue-600">‹</Text>
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-base font-bold text-gray-900 dark:text-white capitalize">
            {format(date, "EEEE, d 'de' MMM", { locale: ptBR })}
          </Text>
          {isToday ? (
            routineItems.length > 0 ? (
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                {doneCount}/{routineItems.length} concluídos
              </Text>
            ) : null
          ) : (
            <TouchableOpacity onPress={() => setDate(new Date())} hitSlop={6}>
              <Text className="text-xs text-blue-600">voltar para hoje</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => shiftDay(1)} hitSlop={10} className="px-2">
          <Text className="text-2xl text-blue-600">›</Text>
        </TouchableOpacity>
      </View>

      {day && (
        <FlatList
          data={day.timeline}
          keyExtractor={(item) => item.key}
          ListHeaderComponent={<AdaptedSummary day={day} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const { source, id } = parseKey(item.key);
            const color = (item.category ? colorByName.get(item.category) : null) ?? '#6B7280';
            const done = source === 'routine' && doneIds.has(id);
            return (
              <TimelineRow
                item={item}
                color={color}
                done={done}
                onToggle={source === 'routine' && !item.removed ? () => toggleBlock(iso, id) : undefined}
                onPress={() => openEditor(item.key)}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
