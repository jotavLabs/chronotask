import { Text, TouchableOpacity, View } from 'react-native';

export const PRIORITIES = ['Alta', 'Média', 'Baixa'] as const;
export type Priority = (typeof PRIORITIES)[number];

const COLORS: Record<Priority, string> = {
  Alta: '#EF4444',
  Média: '#F59E0B',
  Baixa: '#10B981',
};

interface Props {
  value: string;
  onChange: (priority: Priority) => void;
}

export function PriorityPicker({ value, onChange }: Props) {
  return (
    <View className="flex-row">
      {PRIORITIES.map((p) => {
        const selected = p === value;
        const color = COLORS[p];
        return (
          <TouchableOpacity
            key={p}
            onPress={() => onChange(p)}
            className="px-3 py-1.5 rounded-full mr-2 border"
            style={{
              backgroundColor: selected ? color : 'transparent',
              borderColor: color,
            }}
          >
            <Text className="text-xs font-medium" style={{ color: selected ? '#fff' : color }}>
              {p}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
