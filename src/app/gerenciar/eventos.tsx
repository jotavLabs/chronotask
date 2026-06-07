import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { SectionList, Text, TouchableOpacity, View } from 'react-native';
import { toIsoDate } from '@/lib/dayResolver';
import { getUpcomingEvents } from '@/repositories/eventsRepo';
import type { EventWithCategory } from '@/repositories/eventsRepo';

const PRIO_COLOR: Record<string, string> = {
  Alta: '#EF4444',
  Média: '#F59E0B',
  Baixa: '#10B981',
};

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function EventosScreen() {
  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const [items, setItems] = useState<EventWithCategory[]>([]);

  const load = useCallback(() => {
    setItems(getUpcomingEvents(todayIso));
  }, [todayIso]);

  useFocusEffect(load);

  const sections = useMemo(() => {
    const map = new Map<string, EventWithCategory[]>();
    for (const e of items) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return Array.from(map, ([title, data]) => ({ title, data }));
  }, [items]);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 96 }}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-sm text-gray-400">Nenhum compromisso futuro</Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize mt-3 mb-1 px-1">
            {format(parseIso(section.title), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </Text>
        )}
        renderItem={({ item }) => {
          const color = item.categoryColor ?? '#6B7280';
          const prioColor = item.priority ? PRIO_COLOR[item.priority] ?? '#6B7280' : '#6B7280';
          return (
            <TouchableOpacity
              onPress={() =>
                router.push({ pathname: '/gerenciar/evento-form', params: { id: String(item.id) } })
              }
              className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl p-3 mb-2"
              style={{ borderLeftWidth: 3, borderLeftColor: color }}
            >
              <View className="mr-3">
                <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">{item.start}</Text>
                <Text className="text-xs text-gray-400">{item.end}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-800 dark:text-gray-100" numberOfLines={1}>
                  {item.title}
                </Text>
                {item.categoryName ? (
                  <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.categoryName}</Text>
                ) : null}
              </View>
              {item.priority ? (
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${prioColor}22` }}>
                  <Text className="text-xs font-medium" style={{ color: prioColor }}>
                    {item.priority}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        onPress={() => router.push('/gerenciar/evento-form')}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 items-center justify-center"
        style={{ elevation: 4 }}
      >
        <Text className="text-white text-3xl -mt-0.5">+</Text>
      </TouchableOpacity>
    </View>
  );
}
