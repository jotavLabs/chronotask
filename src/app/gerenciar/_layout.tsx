import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function GerenciarLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Gerenciar' }} />
      <Stack.Screen name="blocos" options={{ title: 'Blocos da rotina' }} />
      <Stack.Screen name="bloco-form" options={{ title: 'Bloco', presentation: 'modal' }} />
      <Stack.Screen name="mensais" options={{ title: 'Rotinas mensais' }} />
      <Stack.Screen name="mensal-form" options={{ title: 'Rotina mensal', presentation: 'modal' }} />
      <Stack.Screen name="eventos" options={{ title: 'Compromissos' }} />
      <Stack.Screen name="evento-form" options={{ title: 'Compromisso', presentation: 'modal' }} />
      <Stack.Screen name="categorias" options={{ title: 'Categorias & prioridades' }} />
      <Stack.Screen name="categoria-form" options={{ title: 'Categoria', presentation: 'modal' }} />
    </Stack>
  );
}
