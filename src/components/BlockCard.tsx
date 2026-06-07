import { Text, View } from 'react-native';
import type { BlockWithCategory } from '@/repositories/blocksRepo';
import { CheckBox } from './CheckBox';

interface Props {
  block: BlockWithCategory;
  done: boolean;
  onToggle: () => void;
}

export function BlockCard({ block, done, onToggle }: Props) {
  const color = block.categoryColor ?? '#6B7280';

  return (
    <View
      className={`flex-row items-center px-4 py-3 my-1 mx-3 rounded-xl bg-white dark:bg-gray-800 ${done ? 'opacity-50' : ''}`}
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <View className="flex-1 mr-3">
        <Text
          className={`text-sm font-medium text-gray-800 dark:text-gray-100 ${done ? 'line-through' : ''}`}
          numberOfLines={2}
        >
          {block.activity}
        </Text>
        <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {block.start} – {block.end} · {block.durationMin}min
          {block.categoryName ? ` · ${block.categoryName}` : ''}
        </Text>
        {block.note ? (
          <Text className="text-xs text-gray-400 dark:text-gray-500 italic">{block.note}</Text>
        ) : null}
      </View>
      <CheckBox checked={done} onToggle={onToggle} color={color} />
    </View>
  );
}
