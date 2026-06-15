import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { formatDuration } from '@/lib/validation';
import type { BlockWithCategory } from '@/repositories/blocksRepo';

const ROW_H = 60;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const move = <T,>(arr: T[], from: number, to: number): T[] => {
  const next = arr.slice();
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
};

type RowCallbacks = {
  onStart: (id: number) => void;
  onMove: (dy: number) => void;
  onEnd: () => void;
};

function Row({
  item,
  dragging,
  panY,
  onPress,
  onDelete,
  cb,
}: {
  item: BlockWithCategory;
  dragging: boolean;
  panY: Animated.Value;
  onPress: () => void;
  onDelete: () => void;
  cb: RowCallbacks;
}) {
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => cb.onStart(item.id),
      onPanResponderMove: (_e, g) => cb.onMove(g.dy),
      onPanResponderRelease: () => cb.onEnd(),
      onPanResponderTerminate: () => cb.onEnd(),
    }),
  ).current;

  const color = item.categoryColor ?? '#6B7280';
  return (
    <Animated.View
      style={{
        height: ROW_H,
        transform: [{ translateY: dragging ? panY : 0 }],
        zIndex: dragging ? 10 : 0,
        elevation: dragging ? 10 : 0,
        opacity: dragging ? 0.95 : 1,
      }}
    >
      <View
        className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl px-1 mx-3"
        style={{ height: ROW_H - 8, marginTop: 4, borderLeftWidth: 3, borderLeftColor: color }}
      >
        <View {...responder.panHandlers} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="px-2 py-2">
          <Text className="text-lg text-gray-300 dark:text-gray-500">⠿</Text>
        </View>

        <TouchableOpacity className="flex-1 px-1" onPress={onPress}>
          <Text className="text-sm font-medium text-gray-800 dark:text-gray-100" numberOfLines={1}>
            {item.activity}
          </Text>
          <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5" numberOfLines={1}>
            {item.start}–{item.end} · {formatDuration(item.durationMin)}
            {item.categoryName ? ` · ${item.categoryName}` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onDelete} hitSlop={8} className="px-2">
          <Text className="text-base">🗑️</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

/**
 * Long-press the ⠿ handle and drag to reorder. Rows shuffle live (fixed height);
 * on release the new id order is reported. The screen persists + recomputes times.
 */
export function DraggableRoutineList({
  items,
  onReorder,
  onPressItem,
  onDeleteItem,
}: {
  items: BlockWithCategory[];
  onReorder: (orderedIds: number[]) => void;
  onPressItem: (id: number) => void;
  onDeleteItem: (id: number) => void;
}) {
  const [order, setOrder] = useState<BlockWithCategory[]>(items);
  const [dragId, setDragId] = useState<number | null>(null);
  const panY = useRef(new Animated.Value(0)).current;
  const meta = useRef({ startIndex: 0, dragIndex: 0 }).current;
  const orderRef = useRef(order);
  orderRef.current = order;

  useEffect(() => {
    if (dragId == null) setOrder(items); // don't clobber mid-drag
  }, [items, dragId]);

  const cb: RowCallbacks = {
    onStart(id) {
      const idx = orderRef.current.findIndex((b) => b.id === id);
      meta.startIndex = idx;
      meta.dragIndex = idx;
      setDragId(id);
      panY.setValue(0);
    },
    onMove(dy) {
      const target = clamp(meta.startIndex + Math.round(dy / ROW_H), 0, orderRef.current.length - 1);
      if (target !== meta.dragIndex) {
        setOrder(move(orderRef.current, meta.dragIndex, target));
        meta.dragIndex = target;
      }
      panY.setValue(dy - (meta.dragIndex - meta.startIndex) * ROW_H);
    },
    onEnd() {
      if (dragId == null) return;
      onReorder(orderRef.current.map((b) => b.id));
      setDragId(null);
      panY.setValue(0);
    },
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingVertical: 8, paddingBottom: 96 }}
      scrollEnabled={dragId == null}
      showsVerticalScrollIndicator={false}
    >
      {order.map((item) => (
        <Row
          key={item.id}
          item={item}
          dragging={item.id === dragId}
          panY={panY}
          onPress={() => onPressItem(item.id)}
          onDelete={() => onDeleteItem(item.id)}
          cb={cb}
        />
      ))}
    </ScrollView>
  );
}
