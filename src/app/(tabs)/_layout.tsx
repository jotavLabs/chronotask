import { Tabs } from 'expo-router';
import { Text, useColorScheme } from 'react-native';
import type { ColorValue } from 'react-native';

const ACTIVE = '#3B82F6';
const INACTIVE_LIGHT = '#9CA3AF';
const INACTIVE_DARK = '#6B7280';

function TabIcon({ label }: { label: string; color: ColorValue }) {
  return <Text style={{ fontSize: 18 }}>{label}</Text>;
}

export default function TabsLayout() {
  const scheme = useColorScheme();
  const inactive = scheme === 'dark' ? INACTIVE_DARK : INACTIVE_LIGHT;
  const bg = scheme === 'dark' ? '#111827' : '#FFFFFF';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: {
          backgroundColor: bg,
          borderTopColor: scheme === 'dark' ? '#1F2937' : '#E5E7EB',
        },
        headerStyle: { backgroundColor: bg },
        headerTintColor: scheme === 'dark' ? '#F9FAFB' : '#111827',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoje',
          tabBarIcon: (p) => <TabIcon label="☀️" color={p.color} />,
        }}
      />
      <Tabs.Screen
        name="semana"
        options={{
          title: 'Semana',
          tabBarIcon: (p) => <TabIcon label="📅" color={p.color} />,
        }}
      />
      <Tabs.Screen
        name="treino"
        options={{
          title: 'Treino',
          tabBarIcon: (p) => <TabIcon label="💪" color={p.color} />,
        }}
      />
      <Tabs.Screen
        name="estudos"
        options={{
          title: 'Estudos',
          tabBarIcon: (p) => <TabIcon label="📚" color={p.color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: (p) => <TabIcon label="📊" color={p.color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: (p) => <TabIcon label="💬" color={p.color} />,
        }}
      />
    </Tabs>
  );
}
