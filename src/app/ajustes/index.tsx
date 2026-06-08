import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { Href } from 'expo-router';
import { THEME_MODES } from '@/lib/theme';
import { useThemeStore } from '@/store/themeStore';

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mt-5 mb-2 px-1">
      {children}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">{children}</View>;
}

function LinkRow({ href, icon, label }: { href: Href; icon: string; label: string }) {
  return (
    <Link href={href} asChild>
      <Pressable className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 active:opacity-60">
        <Text className="text-base mr-3">{icon}</Text>
        <Text className="flex-1 text-sm text-gray-800 dark:text-gray-100">{label}</Text>
        <Text className="text-gray-300 dark:text-gray-600 text-lg">›</Text>
      </Pressable>
    </Link>
  );
}

export default function AjustesScreen() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <SectionTitle>Aparência</SectionTitle>
      <Card>
        {THEME_MODES.map((opt, i) => {
          const selected = mode === opt.mode;
          return (
            <TouchableOpacity
              key={opt.mode}
              onPress={() => setMode(opt.mode)}
              className={`flex-row items-center px-4 py-3 ${
                i < THEME_MODES.length - 1 ? 'border-b border-gray-100 dark:border-gray-700/50' : ''
              }`}
            >
              <Text className="text-base mr-3">{opt.icon}</Text>
              <Text className="flex-1 text-sm text-gray-800 dark:text-gray-100">{opt.label}</Text>
              {selected && <Text className="text-blue-600 dark:text-blue-400 text-base font-bold">✓</Text>}
            </TouchableOpacity>
          );
        })}
      </Card>

      <SectionTitle>Rotina</SectionTitle>
      <Card>
        <LinkRow href="/gerenciar" icon="🗂️" label="Gerenciar rotina e dados" />
        <LinkRow href="/gerenciar/categorias" icon="🎨" label="Categorias & prioridades" />
      </Card>

      <SectionTitle>Em breve</SectionTitle>
      <Card>
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
          <Text className="text-base mr-3">🔔</Text>
          <Text className="flex-1 text-sm text-gray-400 dark:text-gray-500">Notificações</Text>
          <Text className="text-xs text-gray-300 dark:text-gray-600">Sprint 6</Text>
        </View>
        <View className="flex-row items-center px-4 py-3">
          <Text className="text-base mr-3">💾</Text>
          <Text className="flex-1 text-sm text-gray-400 dark:text-gray-500">Backup / exportação</Text>
          <Text className="text-xs text-gray-300 dark:text-gray-600">Sprint 6</Text>
        </View>
      </Card>
    </ScrollView>
  );
}
