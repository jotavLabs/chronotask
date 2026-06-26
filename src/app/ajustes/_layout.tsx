import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function AjustesLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Ajustes' }} />
      <Stack.Screen name="inicio" options={{ title: 'Ponto de partida' }} />
    </Stack>
  );
}
