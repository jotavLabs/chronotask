import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, PanResponder, ScrollView, Text, View } from 'react-native';

const ROW_H = 64;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const move = <T,>(arr: T[], from: number, to: number): T[] => {
  const next = arr.slice();
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
};

type Cb = { onStart: (id: number) => void; onMove: (dy: number) => void; onEnd: (dy: number) => void };

function Row<T>({
  item,
  id,
  dragging,
  panY,
  rowHeight,
  accent,
  renderContent,
  cb,
}: {
  item: T;
  id: number;
  dragging: boolean;
  panY: Animated.Value;
  rowHeight: number;
  accent: string;
  renderContent: (item: T) => ReactNode;
  cb: Cb;
}) {
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => cb.onStart(id),
      onPanResponderMove: (_e, g) => cb.onMove(g.dy),
      onPanResponderRelease: (_e, g) => cb.onEnd(g.dy),
      onPanResponderTerminate: (_e, g) => cb.onEnd(g.dy),
    }),
  ).current;

  return (
    <Animated.View
      style={{
        height: rowHeight,
        transform: dragging ? [{ translateY: panY }, { scale: 1.03 }] : [],
        zIndex: dragging ? 10 : 0,
        elevation: dragging ? 8 : 0,
        opacity: dragging ? 0.97 : 1,
      }}
    >
      <View
        className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl mx-3"
        style={{ height: rowHeight - 8, marginTop: 4, borderLeftWidth: 3, borderLeftColor: accent }}
      >
        <View {...responder.panHandlers} hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }} className="pl-2 pr-1 py-3">
          <Text className="text-xl text-gray-300 dark:text-gray-500">⠿</Text>
        </View>
        <View className="flex-1">{renderContent(item)}</View>
      </View>
    </Animated.View>
  );
}

/**
 * Generic drag-to-reorder list. The dragged row lifts and follows the finger via
 * pure Animated (no re-render mid-gesture, so it stays smooth); the new id order is
 * reported once on release. Used for routine blocks and training exercises.
 */
export function DraggableList<T>({
  items,
  getId,
  getAccent,
  renderContent,
  onReorder,
  rowHeight = ROW_H,
}: {
  items: T[];
  getId: (item: T) => number;
  getAccent?: (item: T) => string;
  renderContent: (item: T) => ReactNode;
  onReorder: (orderedIds: number[]) => void;
  rowHeight?: number;
}) {
  const [order, setOrder] = useState<T[]>(items);
  const [dragId, setDragId] = useState<number | null>(null);
  const panY = useRef(new Animated.Value(0)).current;
  const meta = useRef({ startIndex: 0 });
  const orderRef = useRef(order);
  orderRef.current = order;

  useEffect(() => {
    if (dragId == null) setOrder(items);
  }, [items, dragId]);

  const cb: Cb = {
    onStart(id) {
      meta.current.startIndex = orderRef.current.findIndex((x) => getId(x) === id);
      panY.setValue(0);
      setDragId(id);
    },
    onMove(dy) {
      panY.setValue(dy);
    },
    onEnd(dy) {
      const { startIndex } = meta.current;
      const target = clamp(startIndex + Math.round(dy / rowHeight), 0, orderRef.current.length - 1);
      if (target !== startIndex) {
        const next = move(orderRef.current, startIndex, target);
        setOrder(next);
        onReorder(next.map(getId));
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
      {order.map((item) => {
        const id = getId(item);
        return (
          <Row
            key={id}
            item={item}
            id={id}
            dragging={id === dragId}
            panY={panY}
            rowHeight={rowHeight}
            accent={getAccent?.(item) ?? '#6B7280'}
            renderContent={renderContent}
            cb={cb}
          />
        );
      })}
    </ScrollView>
  );
}
