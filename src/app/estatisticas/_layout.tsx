import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function EstatisticasLayout() {
  const { tokens } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.surface },
        headerTintColor: tokens.text,
        headerTitleStyle: { fontWeight: '600' },
        headerBackTitle: 'Voltar',
        contentStyle: { backgroundColor: tokens.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Estatísticas' }} />
    </Stack>
  );
}
