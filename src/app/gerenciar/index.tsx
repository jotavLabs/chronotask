import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Href } from 'expo-router';

type Entry = { href: Href; icon: string; title: string; subtitle: string };

const ENTRIES: Entry[] = [
  {
    href: '/gerenciar/blocos',
    icon: '🗓️',
    title: 'Blocos da rotina',
    subtitle: 'Criar, editar, reordenar blocos de cada dia',
  },
  {
    href: '/gerenciar/mensais',
    icon: '🔁',
    title: 'Rotinas mensais',
    subtitle: 'Janela flexível, agendar e marcar como feita',
  },
  {
    href: '/gerenciar/eventos',
    icon: '📌',
    title: 'Compromissos',
    subtitle: 'Eventos pontuais com data e hora',
  },
  {
    href: '/gerenciar/categorias',
    icon: '🎨',
    title: 'Categorias & prioridades',
    subtitle: 'Ordem de corte, protegidas e cores do motor',
  },
];

export default function GerenciarHub() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {ENTRIES.map((e) => (
        <Link key={e.title} href={e.href} asChild>
          <Pressable className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl p-4 mb-3">
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
  );
}
