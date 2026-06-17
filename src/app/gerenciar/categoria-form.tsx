import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormField } from '@/components/FormField';
import {
  countCategoryUsage,
  createCategory,
  deleteCategory,
  getAllCategories,
  isCuttable,
  updateCategory,
} from '@/repositories/categoriesRepo';

const INPUT =
  'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800';

const PALETTE = [
  '#3B82F6', '#8B5CF6', '#6B7280', '#F59E0B', '#EF4444', '#10B981',
  '#F97316', '#EC4899', '#06B6D4', '#84CC16', '#14B8A6', '#A855F7',
];

export default function CategoriaForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const catId = params.id ? Number(params.id) : null;
  const editing = catId != null;

  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [isProtected, setIsProtected] = useState(false);
  const [cutOrder, setCutOrder] = useState<number>(1);
  const [tieGroup, setTieGroup] = useState('');
  const [skipOnHoliday, setSkipOnHoliday] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [usageBlock, setUsageBlock] = useState<number | null>(null);

  useEffect(() => {
    if (catId == null) return;
    const c = getAllCategories().find((x) => x.id === catId);
    if (c) {
      setName(c.name);
      setColor(c.color ?? PALETTE[0]);
      setIsProtected(c.protected === 1);
      setCutOrder(c.cutOrder ?? 1);
      setTieGroup(c.tieGroup ?? '');
      setSkipOnHoliday(c.skipOnHoliday === 1);
    }
  }, [catId]);

  function handleSave() {
    if (!name.trim()) {
      setError('Informe o nome');
      return;
    }
    // never leave the engine without a cuttable level
    const others = getAllCategories().filter((c) => c.id !== catId);
    const willBeCuttable = !isProtected; // has a cutOrder when not protected
    const cuttableCount = others.filter(isCuttable).length + (willBeCuttable ? 1 : 0);
    if (cuttableCount === 0) {
      setError('Pelo menos uma categoria precisa ser cortável (não protegida).');
      return;
    }

    const input = {
      name,
      cutOrder: isProtected ? null : cutOrder,
      protected: isProtected ? 1 : 0,
      tieGroup,
      color,
      skipOnHoliday: skipOnHoliday ? 1 : 0,
    };
    if (editing && catId != null) updateCategory(catId, input);
    else createCategory(input);
    router.back();
  }

  function handleDelete() {
    if (catId == null) return;
    const usage = countCategoryUsage(catId);
    if (usage > 0) {
      setConfirmDelete(false);
      setUsageBlock(usage);
      return;
    }
    deleteCategory(catId);
    setConfirmDelete(false);
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen options={{ title: editing ? 'Editar categoria' : 'Nova categoria' }} />

      <FormField label="Nome" error={error ?? undefined}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex.: Hobby"
          placeholderTextColor="#9CA3AF"
          className={INPUT}
        />
      </FormField>

      <FormField label="Cor">
        <View className="flex-row flex-wrap">
          {PALETTE.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              className="mr-2 mb-2 rounded-full items-center justify-center"
              style={{
                width: 32,
                height: 32,
                backgroundColor: c,
                borderWidth: color === c ? 3 : 0,
                borderColor: '#111827',
              }}
            />
          ))}
        </View>
      </FormField>

      <View className="flex-row items-center justify-between py-2 mb-2">
        <View className="flex-1 pr-3">
          <Text className="text-sm font-medium text-gray-800 dark:text-gray-100">Protegida</Text>
          <Text className="text-xs text-gray-400 dark:text-gray-500">Nunca é cortada (ex.: Trabalho)</Text>
        </View>
        <Switch value={isProtected} onValueChange={setIsProtected} />
      </View>

      <View className="flex-row items-center justify-between py-2 mb-2">
        <View className="flex-1 pr-3">
          <Text className="text-sm font-medium text-gray-800 dark:text-gray-100">Sair em feriado</Text>
          <Text className="text-xs text-gray-400 dark:text-gray-500">
            Em feriado, os blocos desta categoria somem e o tempo livre absorve (ex.: Trabalho)
          </Text>
        </View>
        <Switch value={skipOnHoliday} onValueChange={setSkipOnHoliday} />
      </View>

      {!isProtected && (
        <FormField label="Ordem de corte (1 = cortado primeiro)">
          <View className="flex-row">
            {[1, 2, 3, 4, 5].map((n) => {
              const selected = cutOrder === n;
              return (
                <TouchableOpacity
                  key={n}
                  onPress={() => setCutOrder(n)}
                  className={`w-10 h-10 rounded-lg mr-2 items-center justify-center border ${
                    selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Text className={selected ? 'text-white font-bold' : 'text-gray-600 dark:text-gray-300'}>
                    {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FormField>
      )}

      <FormField label="Grupo de empate (opcional)">
        <TextInput
          value={tieGroup}
          onChangeText={setTieGroup}
          placeholder="Ex.: treino_estudo (corte proporcional juntos)"
          placeholderTextColor="#9CA3AF"
          className={INPUT}
        />
      </FormField>

      <TouchableOpacity onPress={handleSave} className="bg-blue-600 rounded-lg py-3 items-center mt-2">
        <Text className="text-white font-semibold">Salvar</Text>
      </TouchableOpacity>

      {editing && (
        <TouchableOpacity onPress={() => setConfirmDelete(true)} className="py-3 items-center mt-1">
          <Text className="text-red-500 font-medium">Excluir categoria</Text>
        </TouchableOpacity>
      )}

      {usageBlock != null && (
        <Text className="text-xs text-red-500 text-center mt-2">
          Não é possível excluir: {usageBlock} item(ns) usam esta categoria. Reatribua-os antes.
        </Text>
      )}

      <ConfirmDialog
        visible={confirmDelete}
        title="Excluir categoria?"
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </ScrollView>
  );
}
