import { Text, View } from 'react-native';

export type Bar = { value: number; label: string; color: string };

interface Props {
  data: Bar[];
  height?: number;
  unit?: string; // shown after the value, e.g. 'h'
}

/** Lightweight bar chart in pure Views — no native gradient dependency. */
export function BarChartSimple({ data, height = 160, unit = '' }: Props) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barArea = height - 34; // leave room for value + label

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height }}>
      {data.map((d) => (
        <View key={d.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Text className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
            {d.value}
            {unit}
          </Text>
          <View
            style={{
              width: '62%',
              height: Math.max(2, (d.value / max) * barArea),
              backgroundColor: d.color,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
            }}
          />
          <Text className="text-[10px] text-gray-500 dark:text-gray-400 mt-1" numberOfLines={1}>
            {d.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
