import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { DateField } from '@/components/DateField';
import { toIsoDate } from '@/lib/dayResolver';
import { getMonthlyStatus, MONTHLY_STATUS_LABEL } from '@/lib/recurrence';
import type { MonthlyStatus } from '@/lib/recurrence';
import { formatDuration } from '@/lib/validation';
import {
  getAllMonthly,
  markMonthlyDone,
  scheduleMonthly,
} from '@/repositories/monthlyRoutinesRepo';
import type { MonthlyWithCategory } from '@/repositories/monthlyRoutinesRepo';

const STATUS_BG: Record<MonthlyStatus, string> = {
  HOJE: '#DBEAFE',
  FEITA: '#D1FAE5',
  AGENDADA: '#E0E7FF',
  AGENDAR: '#FEF3C7',
  ATRASADA: '#FEE2E2',
  AGUARDANDO: 'transparent',
};
const STATUS_FG: Record<MonthlyStatus, string> = {
  HOJE: '#1E40AF',
  FEITA: '#065F46',
  AGENDADA: '#3730A3',
  AGENDAR: '#92400E',
  ATRASADA: '#991B1B',
  AGUARDANDO: 'transparent',
};

export default function MensaisScreen() {
  const today = useMemo(() => new Date(), []);
  const todayIso = toIsoDate(today);
  const [items, setItems] = useState<MonthlyWithCategory[]>([]);

  const load = useCallback(() => {
    setItems(getAllMonthly());
  }, []);

  useFocusEffect(load);

  function schedule(id: number, iso: string) {
    scheduleMonthly(id, iso);
    load();
  }

  function markDone(id: number) {
    markMonthlyDone(id, todayIso);
    load();
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 96 }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-sm text-gray-400">Nenhuma rotina mensal</Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = getMonthlyStatus(item, today);
          const color = item.categoryColor ?? '#6B7280';
          return (
            <View
              className="bg-white dark:bg-gray-800 rounded-xl p-3 mb-2"
              style={{ borderLeftWidth: 3, borderLeftColor: color }}
            >
              <TouchableOpacity
                onPress={() =>
                  router.push({ pathname: '/gerenciar/mensal-form', params: { id: String(item.id) } })
                }
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-gray-900 dark:text-white flex-1" numberOfLines={1}>
                    {item.name}
                  </Text>
                  {status !== 'AGUARDANDO' && (
                    <View className="px-2 py-0.5 rounded-full ml-2" style={{ backgroundColor: STATUS_BG[status] }}>
                      <Text className="text-xs font-semibold" style={{ color: STATUS_FG[status] }}>
                        {MONTHLY_STATUS_LABEL[status]}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Janela {item.windowStartDay}–{item.windowEndDay} · {formatDuration(item.durationMin)}
                  {item.categoryName ? ` · ${item.categoryName}` : ''}
                </Text>
              </TouchableOpacity>

              <View className="flex-row items-center mt-2">
                <View className="flex-1 mr-2">
                  <DateField
                    value={item.scheduledDate ?? ''}
                    onChange={(iso) => schedule(item.id, iso)}
                    placeholder="Agendar este mês"
                  />
                </View>
                <TouchableOpacity onPress={() => markDone(item.id)} className="px-3 py-2 rounded-lg bg-green-600">
                  <Text className="text-xs font-semibold text-white">✓ Feita</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity
        onPress={() => router.push('/gerenciar/mensal-form')}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 items-center justify-center"
        style={{ elevation: 4 }}
      >
        <Text className="text-white text-3xl -mt-0.5">+</Text>
      </TouchableOpacity>
    </View>
  );
}
