import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { getAllCategories } from '@/repositories/categoriesRepo';
import type { Category } from '@/db/schema';

export default function CategoriasScreen() {
  const [cats, setCats] = useState<Category[]>([]);

  const load = useCallback(() => {
    const all = getAllCategories();
    all.sort((a, b) => {
      if (a.protected !== b.protected) return b.protected - a.protected;
      return (a.cutOrder ?? 99) - (b.cutOrder ?? 99);
    });
    setCats(all);
  }, []);

  useFocusEffect(load);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <Text className="text-xs text-gray-400 dark:text-gray-500 px-4 pt-3">
        Ordem de corte: 1 é cortado primeiro. Protegidas nunca são cortadas pelo motor.
      </Text>
      <FlatList
        data={cats}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 96 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: '/gerenciar/categoria-form', params: { id: String(item.id) } })
            }
            className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl p-3 mb-2"
          >
            <View className="w-5 h-5 rounded-full mr-3" style={{ backgroundColor: item.color ?? '#6B7280' }} />
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</Text>
              {item.tieGroup ? (
                <Text className="text-xs text-gray-400 dark:text-gray-500">grupo: {item.tieGroup}</Text>
              ) : null}
            </View>
            {item.fixedTime === 1 ? (
              <View className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 mr-1.5">
                <Text className="text-xs font-semibold text-amber-700 dark:text-amber-300">⏱ fixo</Text>
              </View>
            ) : null}
            {item.protected === 1 ? (
              <View className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40">
                <Text className="text-xs font-semibold text-blue-700 dark:text-blue-300">protegida</Text>
              </View>
            ) : item.cutOrder != null ? (
              <View className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                <Text className="text-xs font-medium text-gray-600 dark:text-gray-300">corte {item.cutOrder}</Text>
              </View>
            ) : (
              <View className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                <Text className="text-xs text-gray-500">nunca corta</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        onPress={() => router.push('/gerenciar/categoria-form')}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 items-center justify-center"
        style={{ elevation: 4 }}
      >
        <Text className="text-white text-3xl -mt-0.5">+</Text>
      </TouchableOpacity>
    </View>
  );
}
