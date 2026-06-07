import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function GerenciarLayout() {
  const scheme = useColorScheme();
  const bg = scheme === 'dark' ? '#111827' : '#FFFFFF';
  const tint = scheme === 'dark' ? '#F9FAFB' : '#111827';

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: bg },
        headerTintColor: tint,
        headerTitleStyle: { fontWeight: '600' },
        headerBackTitle: 'Voltar',
        contentStyle: { backgroundColor: scheme === 'dark' ? '#0B1120' : '#F9FAFB' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Gerenciar' }} />
      <Stack.Screen name="blocos" options={{ title: 'Blocos da rotina' }} />
      <Stack.Screen name="bloco-form" options={{ title: 'Bloco', presentation: 'modal' }} />
      <Stack.Screen name="mensais" options={{ title: 'Rotinas mensais' }} />
      <Stack.Screen name="mensal-form" options={{ title: 'Rotina mensal', presentation: 'modal' }} />
      <Stack.Screen name="eventos" options={{ title: 'Compromissos' }} />
      <Stack.Screen name="evento-form" options={{ title: 'Compromisso', presentation: 'modal' }} />
    </Stack>
  );
}
