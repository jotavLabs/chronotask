import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DayPicker } from '@/components/DayPicker';
import { DraggableRoutineList } from '@/components/DraggableRoutineList';
import { resolveDayLabel } from '@/lib/dayResolver';
import type { DayLabel } from '@/lib/dayResolver';
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
          <DraggableRoutineList
            items={blocks}
            onReorder={onReorder}
            onPressItem={(id) => router.push({ pathname: '/gerenciar/bloco-form', params: { id: String(id) } })}
            onDeleteItem={(id) => setPendingDelete(id)}
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
