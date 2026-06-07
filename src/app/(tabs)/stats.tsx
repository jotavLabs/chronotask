import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StatsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center">
      <Text className="text-4xl mb-3">📊</Text>
      <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100">Estatísticas</Text>
      <Text className="text-sm text-gray-400 dark:text-gray-500 mt-1">Sprint 5</Text>
    </SafeAreaView>
  );
}
