import { ScrollView, Text, TouchableOpacity } from 'react-native';
import type { Category } from '@/db/schema';

interface Props {
  categories: Category[];
  value: number | null;
  onChange: (id: number) => void;
}

export function CategoryPicker({ categories, value, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {categories.map((cat) => {
        const selected = cat.id === value;
        const color = cat.color ?? '#6B7280';
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onChange(cat.id)}
            className="px-3 py-1.5 rounded-full mr-2 border"
            style={{
              backgroundColor: selected ? color : 'transparent',
              borderColor: color,
            }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: selected ? '#fff' : color }}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
