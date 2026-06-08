import { Link, Tabs } from 'expo-router';
import { Text, TouchableOpacity } from 'react-native';
import type { ColorValue } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

function TabIcon({ label }: { label: string; color: ColorValue }) {
  return <Text style={{ fontSize: 18 }}>{label}</Text>;
}

function SettingsButton() {
  return (
    <Link href="/ajustes" asChild>
      <TouchableOpacity hitSlop={8} style={{ marginRight: 12 }}>
        <Text style={{ fontSize: 20 }}>⚙️</Text>
      </TouchableOpacity>
    </Link>
  );
}

export default function TabsLayout() {
  const { scheme, tokens } = useTheme();
  const inactive = scheme === 'dark' ? '#6B7280' : '#9CA3AF';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tokens.primary,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: { backgroundColor: tokens.surface, borderTopColor: tokens.border },
        headerStyle: { backgroundColor: tokens.surface },
        headerTintColor: tokens.text,
        headerTitleStyle: { fontWeight: '600' },
        headerRight: () => <SettingsButton />,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoje', tabBarIcon: (p) => <TabIcon label="☀️" color={p.color} /> }} />
      <Tabs.Screen name="semana" options={{ title: 'Semana', tabBarIcon: (p) => <TabIcon label="📅" color={p.color} /> }} />
      <Tabs.Screen name="treino" options={{ title: 'Treino', tabBarIcon: (p) => <TabIcon label="💪" color={p.color} /> }} />
      <Tabs.Screen name="estudos" options={{ title: 'Estudos', tabBarIcon: (p) => <TabIcon label="📚" color={p.color} /> }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats', tabBarIcon: (p) => <TabIcon label="📊" color={p.color} /> }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: (p) => <TabIcon label="💬" color={p.color} /> }} />
    </Tabs>
  );
}
