import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DayPicker } from '@/components/DayPicker';
import { DraggableList } from '@/components/DraggableList';
import { resolveDayLabel } from '@/lib/dayResolver';
import type { DayLabel } from '@/lib/dayResolver';
import { formatDuration } from '@/lib/validation';
import { applyReorder, deleteBlock, getBlocksForDay } from '@/repositories/blocksRepo';
import type { BlockWithCategory } from '@/repositories/blocksRepo';

export default function BlocosScreen() {
  const initialDay = useMemo(() => resolveDayLabel(new Date()), []);
  const [dayLabel, setDayLabel] = useState<DayLabel>(initialDay);
  const [blocks, setBlocks] = useState<BlockWithCategory[]>([]);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const load = useCallback(() => {
    setBlocks(getBlocksForDay(dayLabel));
  }, [dayLabel]);

  useFocusEffect(load);

  function onReorder(orderedIds: number[]) {
    applyReorder(dayLabel, orderedIds);
    load();
  }

  function confirmDelete() {
    if (pendingDelete != null) deleteBlock(pendingDelete);
    setPendingDelete(null);
    load();
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="px-3 pt-3">
        <DayPicker value={dayLabel} onChange={setDayLabel} />
      </View>

      {blocks.length === 0 ? (
        <View className="items-center py-16">
          <Text className="text-sm text-gray-400">Nenhum bloco em {dayLabel}</Text>
        </View>
      ) : (
        <>
          <Text className="text-[11px] text-gray-400 dark:text-gray-500 px-5 pt-1 pb-1">
            Arraste ⠿ para reordenar — os horários se recalculam sozinhos.
          </Text>
          <DraggableList
            items={blocks}
            getId={(b) => b.id}
            getAccent={(b) => b.categoryColor ?? '#6B7280'}
            onReorder={onReorder}
            renderContent={(b) => (
              <View className="flex-row items-center">
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
                <TouchableOpacity onPress={() => setPendingDelete(b.id)} hitSlop={8} className="px-2">
                  <Text className="text-base">🗑️</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </>
      )}

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
