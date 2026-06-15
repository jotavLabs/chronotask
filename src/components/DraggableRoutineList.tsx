import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { formatDuration } from '@/lib/validation';
import type { BlockWithCategory } from '@/repositories/blocksRepo';

const ROW_H = 64;
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
  onEnd: (dy: number) => void;
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
      onMoveShouldSetPanResponderCapture: () => true, // beat the ScrollView to the gesture
      onPanResponderGrant: () => cb.onStart(item.id),
      onPanResponderMove: (_e, g) => cb.onMove(g.dy),
      onPanResponderRelease: (_e, g) => cb.onEnd(g.dy),
      onPanResponderTerminate: (_e, g) => cb.onEnd(g.dy),
    }),
  ).current;

  const color = item.categoryColor ?? '#6B7280';
  return (
    <Animated.View
      style={{
        height: ROW_H,
        transform: dragging ? [{ translateY: panY }, { scale: 1.03 }] : [],
        zIndex: dragging ? 10 : 0,
        elevation: dragging ? 8 : 0,
        opacity: dragging ? 0.97 : 1,
      }}
    >
      <View
        className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl px-1 mx-3"
        style={{ height: ROW_H - 8, marginTop: 4, borderLeftWidth: 3, borderLeftColor: color }}
      >
        <View {...responder.panHandlers} hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }} className="px-2 py-3">
          <Text className="text-xl text-gray-300 dark:text-gray-500">⠿</Text>
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
 * Drag a row by its ⠿ handle to reorder. The dragged row lifts and follows the
 * finger (pure Animated — no re-render mid-gesture, so it stays smooth); on release
 * the target slot is computed and the new id order is reported once.
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
  const meta = useRef({ startIndex: 0 });
  const orderRef = useRef(order);
  orderRef.current = order;

  useEffect(() => {
    if (dragId == null) setOrder(items); // adopt external updates only when idle
  }, [items, dragId]);

  const cb: RowCallbacks = {
    onStart(id) {
      meta.current.startIndex = orderRef.current.findIndex((b) => b.id === id);
      panY.setValue(0);
      setDragId(id);
    },
    onMove(dy) {
      panY.setValue(dy);
    },
    onEnd(dy) {
      const { startIndex } = meta.current;
      const target = clamp(startIndex + Math.round(dy / ROW_H), 0, orderRef.current.length - 1);
      if (target !== startIndex) {
        const next = move(orderRef.current, startIndex, target);
        setOrder(next);
        onReorder(next.map((b) => b.id));
      }
      panY.setValue(0);
      setDragId(null);
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
