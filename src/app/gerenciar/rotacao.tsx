import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { DraggableList } from '@/components/DraggableList';
import type { RoutineModel } from '@/db/schema';
import { periodStartIso } from '@/lib/scheduling';
import type { RotationPeriod } from '@/lib/scheduling';
import { toIsoDate } from '@/lib/dayResolver';
import { clearAssignment, setAssignment } from '@/repositories/assignmentsRepo';
import { getModels } from '@/repositories/modelsRepo';
import { getRotationItems, getRotationRow, setRotationItems, updateRotation } from '@/repositories/rotationRepo';
import { getResolutionForDate } from '@/repositories/schedulingRepo';

function startOfPeriod(date: Date, period: RotationPeriod): Date {
  const iso = periodStartIso(date, period);
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addPeriods(date: Date, period: RotationPeriod, n: number): Date {
  const d = new Date(date);
  if (period === 'monthly') d.setMonth(d.getMonth() + n);
  else d.setDate(d.getDate() + n * 7);
  return d;
}

export default function RotacaoScreen() {
  const [enabled, setEnabled] = useState(false);
  const [period, setPeriod] = useState<RotationPeriod>('weekly');
  const [anchor, setAnchor] = useState<string | null>(null);
  const [models, setModels] = useState<RoutineModel[]>([]);
  const [loopIds, setLoopIds] = useState<number[]>([]);
  const [tick, setTick] = useState(0); // bump to recompute resolutions after assign

  const load = useCallback(() => {
    const r = getRotationRow();
    setEnabled(r?.enabled === 1);
    setPeriod(r?.period === 'monthly' ? 'monthly' : 'weekly');
    setAnchor(r?.anchorDate ?? null);
    setModels(getModels());
    setLoopIds(getRotationItems().map((i) => i.modelId));
    setTick((t) => t + 1);
  }, []);
  useFocusEffect(load);

  const nameById = useMemo(() => new Map(models.map((m) => [m.id, m.name])), [models]);
  const loopModels = loopIds.map((id) => models.find((m) => m.id === id)).filter((m): m is RoutineModel => !!m);
  const notInLoop = models.filter((m) => !loopIds.includes(m.id));

  function toggleEnabled(v: boolean) {
    updateRotation({ enabled: v });
    setEnabled(v);
  }
  function changePeriod(p: RotationPeriod) {
    updateRotation({ period: p });
    setPeriod(p);
    setTick((t) => t + 1);
  }
  function anchorHere() {
    const iso = periodStartIso(new Date(), period);
    updateRotation({ anchorDate: iso });
    setAnchor(iso);
    setTick((t) => t + 1);
  }
  function setLoop(ids: number[]) {
    setRotationItems(ids);
    setLoopIds(ids);
    setTick((t) => t + 1);
  }

  // next periods preview
  const periods = useMemo(() => {
    const base = startOfPeriod(new Date(), period);
    return Array.from({ length: 5 }, (_, i) => {
      const d = addPeriods(base, period, i);
      const res = getResolutionForDate(d);
      return { date: d, iso: toIsoDate(d), res };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, tick]);

  function periodLabel(d: Date): string {
    if (period === 'monthly') return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return `Semana de ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View className="bg-white dark:bg-gray-800 rounded-xl">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
          <Text className="text-sm text-gray-800 dark:text-gray-100">Ativar rotação em loop</Text>
          <Switch value={enabled} onValueChange={toggleEnabled} />
        </View>
        <View className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
          <Text className="text-xs text-gray-400 dark:text-gray-500 mb-2">Período</Text>
          <View className="flex-row">
            {(['weekly', 'monthly'] as RotationPeriod[]).map((p) => {
              const sel = period === p;
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => changePeriod(p)}
                  className={`px-3 py-1.5 rounded-full mr-2 border ${sel ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <Text className={`text-xs font-medium ${sel ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                    {p === 'weekly' ? 'Semanal' : 'Mensal'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-1 pr-2">
            <Text className="text-sm text-gray-800 dark:text-gray-100">Início da contagem</Text>
            <Text className="text-[11px] text-gray-400 dark:text-gray-500">{anchor ?? '—'}</Text>
          </View>
          <TouchableOpacity onPress={anchorHere} className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
            <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">Começar agora</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mt-5 mb-2 px-1">Loop de modelos</Text>
      {loopModels.length === 0 ? (
        <Text className="text-sm text-gray-400 px-1 mb-2">Nenhum modelo no loop ainda.</Text>
      ) : (
        <View style={{ height: loopModels.length * 64 + 8 }}>
          <DraggableList
            items={loopModels}
            getId={(m) => m.id}
            getAccent={() => '#3B82F6'}
            onReorder={(ids) => setLoop(ids)}
            renderContent={(m) => (
              <View className="flex-row items-center">
                <Text className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100 px-1">{m.name}</Text>
                <TouchableOpacity onPress={() => setLoop(loopIds.filter((id) => id !== m.id))} hitSlop={8} className="px-2">
                  <Text className="text-gray-400">✕</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}
      {notInLoop.length > 0 && (
        <View className="flex-row flex-wrap mt-1 px-1">
          {notInLoop.map((m) => (
            <TouchableOpacity
              key={m.id}
              onPress={() => setLoop([...loopIds, m.id])}
              className="px-3 py-1.5 rounded-full mr-2 mb-2 border border-dashed border-gray-400 dark:border-gray-500"
            >
              <Text className="text-xs text-gray-600 dark:text-gray-300">+ {m.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mt-5 mb-2 px-1">Próximos períodos</Text>
      {periods.map((p) => (
        <View key={p.iso} className="bg-white dark:bg-gray-800 rounded-xl p-3 mb-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-800 dark:text-gray-100">{periodLabel(p.date)}</Text>
            <Text className="text-[11px] text-gray-400 dark:text-gray-500">
              {p.res.modelId != null ? `${nameById.get(p.res.modelId) ?? '—'} (${p.res.source})` : 'sem modelo'}
            </Text>
          </View>
          <View className="flex-row flex-wrap mt-2">
            {models.map((m) => {
              const sel = p.res.source === 'assignment' && p.res.modelId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => {
                    setAssignment(p.iso, m.id);
                    setTick((t) => t + 1);
                  }}
                  className={`px-2.5 py-1 rounded-full mr-1.5 mb-1.5 border ${sel ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <Text className={`text-[11px] ${sel ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>{m.name}</Text>
                </TouchableOpacity>
              );
            })}
            {p.res.source === 'assignment' && (
              <TouchableOpacity
                onPress={() => {
                  clearAssignment(p.iso);
                  setTick((t) => t + 1);
                }}
                className="px-2.5 py-1 rounded-full mr-1.5 mb-1.5 bg-gray-100 dark:bg-gray-700"
              >
                <Text className="text-[11px] text-gray-600 dark:text-gray-300">usar loop</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
