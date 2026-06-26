import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Href } from 'expo-router';

type Entry = { href: Href; icon: string; title: string; subtitle: string };

const ENTRIES: Entry[] = [
  { href: '/estatisticas', icon: '📊', title: 'Estatísticas', subtitle: 'Horas por tema, treino, consistência' },
  { href: '/gerenciar', icon: '🗂️', title: 'Gerenciar rotina e dados', subtitle: 'Blocos, mensais, compromissos, categorias' },
  { href: '/ajustes', icon: '⚙️', title: 'Ajustes', subtitle: 'Tema e configurações' },
];

export default function MaisScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {ENTRIES.map((e) => (
          <Link key={e.title} href={e.href} asChild>
            <Pressable className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 active:opacity-70">
              <Text className="text-2xl mr-3">{e.icon}</Text>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">{e.title}</Text>
                <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{e.subtitle}</Text>
              </View>
              <Text className="text-gray-300 dark:text-gray-600 text-xl">›</Text>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
