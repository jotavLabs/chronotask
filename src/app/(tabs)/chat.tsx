import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center">
      <Text className="text-4xl mb-3">💬</Text>
      <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100">Comandos</Text>
      <Text className="text-sm text-gray-400 dark:text-gray-500 mt-1 text-center px-8">
        /feriados · /hoje · /semana{'\n'}Sprint 5
      </Text>
    </SafeAreaView>
  );
}
