import { ScrollView, Text, TouchableOpacity } from 'react-native';
import type { DayLabel } from '@/lib/dayResolver';

export const DAY_LABELS: DayLabel[] = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

interface Props {
  value: DayLabel;
  onChange: (day: DayLabel) => void;
}

export function DayPicker({ value, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {DAY_LABELS.map((day) => {
        const selected = day === value;
        return (
          <TouchableOpacity
            key={day}
            onPress={() => onChange(day)}
            className={`px-3 py-1.5 rounded-full mr-2 border ${
              selected
                ? 'bg-blue-600 border-blue-600'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                selected ? 'text-white' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {day}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

interface MultiProps {
  value: DayLabel[];
  onToggle: (day: DayLabel) => void;
}

/** Multi-select weekday picker — toggle each day on/off (used to create a block on several days at once). */
export function MultiDayPicker({ value, onToggle }: MultiProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {DAY_LABELS.map((day) => {
        const selected = value.includes(day);
        return (
          <TouchableOpacity
            key={day}
            onPress={() => onToggle(day)}
            className={`px-3 py-1.5 rounded-full mr-2 border ${
              selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            <Text className={`text-xs font-medium ${selected ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
              {selected ? '✓ ' : ''}
              {day}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
