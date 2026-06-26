import { Pressable, Text, View } from 'react-native';

export type CheckState = 'done' | 'skip' | 'none';

interface Props {
  checked: boolean;
  onToggle: () => void;
  color?: string;
  /** 3-state override. When omitted, derives from `checked` (done/none). */
  state?: CheckState;
}

const SKIP_COLOR = '#EF4444';

export function CheckBox({ checked, onToggle, color = '#3B82F6', state }: Props) {
  const s: CheckState = state ?? (checked ? 'done' : 'none');
  const borderColor = s === 'skip' ? SKIP_COLOR : color;
  const backgroundColor = s === 'done' ? color : s === 'skip' ? SKIP_COLOR : 'transparent';

  return (
    <Pressable
      onPress={onToggle}
      className="w-6 h-6 rounded border-2 items-center justify-center"
      style={{ borderColor, backgroundColor }}
      hitSlop={8}
    >
      {s === 'done' && (
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
      {s === 'skip' && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', lineHeight: 15 }}>✕</Text>}
    </Pressable>
  );
}
