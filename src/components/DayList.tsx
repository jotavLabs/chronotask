import { FlatList, Text, View } from 'react-native';
import type { BlockWithCategory } from '@/repositories/blocksRepo';
import { BlockCard } from './BlockCard';

interface Props {
  isoDate: string;
  blocks: BlockWithCategory[];
  doneIds: Set<number>;
  onToggle: (blockId: number) => void;
  emptyMessage?: string;
}

export function DayList({ isoDate, blocks, doneIds, onToggle, emptyMessage }: Props) {
  if (blocks.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="text-gray-400 dark:text-gray-500 text-sm">
          {emptyMessage ?? 'Nenhum bloco para este dia'}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={blocks}
      keyExtractor={(item) => `${isoDate}-${item.id}`}
      renderItem={({ item }) => (
        <BlockCard
          block={item}
          done={doneIds.has(item.id)}
          onToggle={() => onToggle(item.id)}
        />
      )}
      contentContainerStyle={{ paddingBottom: 16 }}
      showsVerticalScrollIndicator={false}
    />
  );
}
