import { Text, TouchableOpacity, View } from 'react-native';
import type { TimelineItem } from '@/lib/adaptationEngine';
import { formatDuration } from '@/lib/validation';
import { CheckBox } from './CheckBox';

interface Props {
  item: TimelineItem;
  color: string;
  done: boolean;
  onToggle?: () => void;
  onPress?: () => void;
}

function Badge({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <View className="px-1.5 py-0.5 rounded mr-1" style={{ backgroundColor: bg }}>
      <Text className="text-[10px] font-semibold" style={{ color: fg }}>
        {text}
      </Text>
    </View>
  );
}

export function TimelineRow({ item, color, done, onToggle, onPress }: Props) {
  const dim = item.removed || done;
  const showCheck = onToggle && !item.removed && item.source === 'routine';

  const body = (
    <>
      <Text
        className={`text-sm font-medium text-gray-800 dark:text-gray-100 ${
          item.removed || done ? 'line-through' : ''
        }`}
        numberOfLines={1}
      >
        {item.activity}
      </Text>

      <View className="flex-row items-center flex-wrap mt-1">
        {item.removed ? (
          <Badge text="cortado hoje" bg="#F3F4F6" fg="#6B7280" />
        ) : item.adapted ? (
          <View className="flex-row items-center mr-1">
            <Text className="text-[11px] text-gray-400 line-through mr-1">
              {formatDuration(item.originalDuration)}
            </Text>
            <Text className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              {formatDuration(item.adaptedDuration)}
            </Text>
          </View>
        ) : (
          <Text className="text-[11px] text-gray-400 mr-1">{formatDuration(item.adaptedDuration)}</Text>
        )}

        {item.adapted && !item.removed && <Badge text="ajustado" bg="#DBEAFE" fg="#1E40AF" />}
        {item.source === 'event' && <Badge text="compromisso" bg="#EDE9FE" fg="#5B21B6" />}
        {item.source === 'monthly' && <Badge text="mensal" bg="#E0E7FF" fg="#3730A3" />}
        {item.conflict && <Badge text="⚠ conflito" bg="#FEE2E2" fg="#991B1B" />}
        {item.category ? (
          <Text className="text-[11px] text-gray-400">{item.category}</Text>
        ) : null}
      </View>
    </>
  );

  return (
    <View
      className={`flex-row items-center px-3 py-2.5 my-1 mx-3 rounded-xl bg-white dark:bg-gray-800 ${
        dim ? 'opacity-50' : ''
      }`}
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <View className="w-12 mr-2">
        {item.removed ? (
          <Text className="text-xs text-gray-300 dark:text-gray-600">—</Text>
        ) : (
          <>
            <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">{item.start}</Text>
            <Text className="text-xs text-gray-400">{item.end}</Text>
          </>
        )}
      </View>

      {onPress ? (
        <TouchableOpacity className="flex-1 mr-2" onPress={onPress}>
          {body}
        </TouchableOpacity>
      ) : (
        <View className="flex-1 mr-2">{body}</View>
      )}

      {showCheck && <CheckBox checked={done} onToggle={onToggle!} color={color} />}
    </View>
  );
}
