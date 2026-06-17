import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdaptedSummary } from '@/components/AdaptedSummary';
import { DraggableList } from '@/components/DraggableList';
import { TimelineRow } from '@/components/TimelineRow';
import type { AdaptedDay } from '@/lib/adaptationEngine';
import { resolveDayLabel, toIsoDate } from '@/lib/dayResolver';
import { formatDuration } from '@/lib/validation';
import { loadAdaptedDay } from '@/repositories/adaptedDayRepo';
import { applyReorder, getBlocksForDay } from '@/repositories/blocksRepo';
import type { BlockWithCategory } from '@/repositories/blocksRepo';
import { getAllCategories } from '@/repositories/categoriesRepo';
import { useRoutineStore } from '@/store/routineStore';

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function HojeScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const [date, setDate] = useState<Date>(() => (params.date ? isoToDate(params.date) : new Date()));
  const [day, setDay] = useState<AdaptedDay | null>(null);
  const [baseBlocks, setBaseBlocks] = useState<BlockWithCategory[]>([]);
  const [reordering, setReordering] = useState(false);
  const { dates, loadDoneForDate, toggleBlock } = useRoutineStore();

  // jump to the date requested from Semana ("ver dia adaptado")
  useEffect(() => {
    if (params.date) setDate(isoToDate(params.date));
  }, [params.date]);

  const colorByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of getAllCategories()) if (c.color) m.set(c.name, c.color);
    return m;
  }, []);

  const iso = toIsoDate(date);
  const label = resolveDayLabel(date);

  useFocusEffect(
    useCallback(() => {
      setDay(loadAdaptedDay(date));
      setBaseBlocks(getBlocksForDay(label));
      loadDoneForDate(iso);
    }, [date, iso, label]),
  );

  const doneIds = dates[iso] ?? new Set<number>();
  const isToday = iso === toIsoDate(new Date());
  const isClean = day != null && day.verdict === 'OK';

  function onReorderToday(ids: number[]) {
    applyReorder(label, ids);
    setBaseBlocks(getBlocksForDay(label));
    setDay(loadAdaptedDay(date));
  }

  const routineItems = day ? day.timeline.filter((i) => i.source === 'routine' && !i.removed) : [];
  const doneCount = routineItems.filter((i) => doneIds.has(i.refId)).length;

  function shiftDay(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d);
  }

  function openEditor(source: string, id: number) {
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

      {(isClean || reordering) && (
        <View className="px-4 pb-1 flex-row justify-end">
          <TouchableOpacity
            onPress={() => setReordering((r) => !r)}
            className={`px-3 py-1.5 rounded-full ${reordering ? 'bg-blue-600' : 'bg-gray-100 dark:bg-gray-800'}`}
          >
            <Text className={`text-xs font-semibold ${reordering ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
              {reordering ? '✓ Concluir' : '↕ Reordenar'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {reordering ? (
        <DraggableList
          items={baseBlocks}
          getId={(b) => b.id}
          getAccent={(b) => b.categoryColor ?? '#6B7280'}
          onReorder={onReorderToday}
          renderContent={(b) => (
            <TouchableOpacity className="flex-1 px-1" onPress={() => openEditor('routine', b.id)}>
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
        day && (
          <FlatList
            data={day.timeline}
            keyExtractor={(item) => item.key}
            ListHeaderComponent={<AdaptedSummary day={day} />}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const color = (item.category ? colorByName.get(item.category) : null) ?? '#6B7280';
              const done = item.source === 'routine' && doneIds.has(item.refId);
              return (
                <TimelineRow
                  item={item}
                  color={color}
                  done={done}
                  onToggle={
                    item.source === 'routine' && !item.removed
                      ? () => toggleBlock(iso, item.refId)
                      : undefined
                  }
                  onPress={() => openEditor(item.source, item.refId)}
                />
              );
            }}
          />
        )
      )}
    </SafeAreaView>
  );
}
