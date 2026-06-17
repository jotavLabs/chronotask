import { router } from 'expo-router';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { getTemplates } from '@/lib/templates';
import type { TemplateId } from '@/lib/templates';
import { applyTemplate } from '@/repositories/templatesRepo';

export default function InicioScreen() {
  const templates = getTemplates();

  function onPick(id: TemplateId, name: string) {
    Alert.alert(
      'Redefinir ponto de partida?',
      `Isso substitui TODA a sua rotina atual por "${name}". Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Substituir',
          style: 'destructive',
          onPress: () => {
            applyTemplate(id, { replace: true });
            Alert.alert('Pronto', 'Rotina redefinida. Abra as abas para ver tudo atualizado.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          },
        },
      ],
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-[13px] text-gray-500 dark:text-gray-400 leading-5 mb-4 px-1">
        Escolha um novo ponto de partida. A rotina atual será substituída — as categorias e os
        feriados são mantidos.
      </Text>

      {templates.map((t) => (
        <TouchableOpacity
          key={t.id}
          onPress={() => onPick(t.id, t.name)}
          activeOpacity={0.85}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 active:opacity-70"
        >
          <Text className="text-base font-semibold text-gray-900 dark:text-white">{t.name}</Text>
          <Text className="text-[13px] text-gray-500 dark:text-gray-400 mt-1 leading-5">{t.description}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
