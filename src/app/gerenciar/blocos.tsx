import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DayPicker } from '@/components/DayPicker';
import { resolveDayLabel } from '@/lib/dayResolver';
import type { DayLabel } from '@/lib/dayResolver';
import { formatDuration } from '@/lib/validation';
import { deleteBlock, getBlocksForDay, moveBlock } from '@/repositories/blocksRepo';
import type { BlockWithCategory } from '@/repositories/blocksRepo';
import { buildHolidayDateSet } from '@/repositories/categoriesRepo';

export default function BlocosScreen() {
  const initialDay = useMemo(() => resolveDayLabel(new Date(), buildHolidayDateSet()), []);
  const [dayLabel, setDayLabel] = useState<DayLabel>(initialDay);
  const [blocks, setBlocks] = useState<BlockWithCategory[]>([]);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const load = useCallback(() => {
    setBlocks(getBlocksForDay(dayLabel));
  }, [dayLabel]);

  useFocusEffect(load);

  function move(id: number, direction: 'up' | 'down') {
    moveBlock(dayLabel, id, direction);
    load();
  }

  function confirmDelete() {
    if (pendingDelete != null) deleteBlock(pendingDelete);
    setPendingDelete(null);
    load();
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="px-3 pt-3 pb-1">
        <DayPicker value={dayLabel} onChange={setDayLabel} />
      </View>

      <FlatList
        data={blocks}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 96 }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-sm text-gray-400">Nenhum bloco em {dayLabel}</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const color = item.categoryColor ?? '#6B7280';
          const isFirst = index === 0;
          const isLast = index === blocks.length - 1;
          return (
            <View
              className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl px-2 py-2 mb-2 mx-3"
              style={{ borderLeftWidth: 3, borderLeftColor: color }}
            >
              <View className="mr-1">
                <TouchableOpacity onPress={() => move(item.id, 'up')} disabled={isFirst} hitSlop={6}>
                  <Text className={`text-base ${isFirst ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400'}`}>
                    ▲
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => move(item.id, 'down')} disabled={isLast} hitSlop={6}>
                  <Text className={`text-base ${isLast ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400'}`}>
                    ▼
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="flex-1 px-1"
                onPress={() => router.push({ pathname: '/gerenciar/bloco-form', params: { id: String(item.id) } })}
              >
                <Text className="text-sm font-medium text-gray-800 dark:text-gray-100" numberOfLines={1}>
                  {item.activity}
                </Text>
                <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {item.start}–{item.end} · {formatDuration(item.durationMin)}
                  {item.categoryName ? ` · ${item.categoryName}` : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setPendingDelete(item.id)} hitSlop={8} className="px-2">
                <Text className="text-base">🗑️</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <TouchableOpacity
        onPress={() => router.push({ pathname: '/gerenciar/bloco-form', params: { dayLabel } })}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 items-center justify-center shadow-lg"
        style={{ elevation: 4 }}
      >
        <Text className="text-white text-3xl -mt-0.5">+</Text>
      </TouchableOpacity>

      <ConfirmDialog
        visible={pendingDelete != null}
        title="Excluir bloco?"
        message="As marcações de conclusão deste bloco também serão removidas."
        confirmLabel="Excluir"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}
