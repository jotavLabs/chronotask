import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface Props {
  label: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, error, children }: Props) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</Text>
      {children}
      {error ? <Text className="text-xs text-red-500 mt-1">{error}</Text> : null}
    </View>
  );
}
