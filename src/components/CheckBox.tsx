import { Pressable, View } from 'react-native';

interface Props {
  checked: boolean;
  onToggle: () => void;
  color?: string;
}

export function CheckBox({ checked, onToggle, color = '#3B82F6' }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      className="w-6 h-6 rounded border-2 items-center justify-center"
      style={{ borderColor: color, backgroundColor: checked ? color : 'transparent' }}
      hitSlop={8}
    >
      {checked && (
        <View className="w-3 h-3">
          {/* Checkmark via border trick */}
          <View
            style={{
              width: 10,
              height: 6,
              borderLeftWidth: 2,
              borderBottomWidth: 2,
              borderColor: '#fff',
              transform: [{ rotate: '-45deg' }],
              marginTop: 1,
            }}
          />
        </View>
      )}
    </Pressable>
  );
}
