import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { categoryColorFor } from '@/lib/theme';
import {
  consistency,
  monthRange,
  timeByCategory,
  timeByTopic,
  trainingVolume,
} from '@/lib/stats';
import type { CategoryStat, Consistency, TopicStat, VolumePoint } from '@/lib/stats';
import { formatDuration } from '@/lib/validation';
import { useTheme } from '@/hooks/useTheme';
import { buildHolidayDateSet } from '@/repositories/categoriesRepo';
import {
  getCompletedBlocks,
  getExerciseRepsRange,
  getScheduledCounts,
} from '@/repositories/statsRepo';

const TOPIC_HEX: Record<string, string> = {
  Inglês: '#10B981',
  Matemática: '#3B82F6',
  Redação: '#F59E0B',
  'PM/CAPM': '#8B5CF6',
  'Cloud/AWS': '#06B6D4',
  'Claude/IA': '#EC4899',
};

type Data = {
  topics: TopicStat[];
  cats: CategoryStat[];
  cons: Consistency[];
  volume: VolumePoint[];
};

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mt-5 mb-2 px-4">
      {children}
    </Text>
  );
}

export default function EstatisticasScreen() {
  const { scheme, tokens } = useTheme();
  const [ref, setRef] = useState(() => new Date());
  const [data, setData] = useState<Data | null>(null);

  const year = ref.getFullYear();
  const month = ref.getMonth();

  useFocusEffect(
    useCallback(() => {
      const { startIso, endIso } = monthRange(year, month);
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      const holidays = buildHolidayDateSet();
      const completed = getCompletedBlocks(startIso, endIso);
      const scheduled = getScheduledCounts(start, end, holidays);
      const topics = timeByTopic(completed);
      const cats = timeByCategory(completed);
      const completedTopicCounts = Object.fromEntries(topics.map((t) => [t.topic, t.sessions]));
      const cons = consistency(scheduled.topic, completedTopicCounts);
      const volume = trainingVolume(getExerciseRepsRange(startIso, endIso));
      setData({ topics, cats, cons, volume });
    }, [year, month]),
  );

  function shiftMonth(delta: number) {
    setRef(new Date(year, month + delta, 1));
  }

  const chartData =
    data?.topics.map((t) => ({
      value: Math.round((t.minutes / 60) * 10) / 10,
      label: t.topic.split('/')[0].slice(0, 6),
      frontColor: categoryColorFor(TOPIC_HEX[t.topic] ?? '#10B981', scheme),
    })) ?? [];

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ paddingBottom: 32 }}>
      {/* month selector */}
      <View className="flex-row items-center justify-between px-4 pt-3">
        <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={10} className="px-2">
          <Text className="text-2xl text-blue-600">‹</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-900 dark:text-white capitalize">
          {format(ref, 'MMMM yyyy', { locale: ptBR })}
        </Text>
        <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={10} className="px-2">
          <Text className="text-2xl text-blue-600">›</Text>
        </TouchableOpacity>
      </View>

      {/* study hours by topic */}
      <SectionTitle>Horas por tema de estudo</SectionTitle>
      {chartData.length === 0 ? (
        <Text className="px-4 text-sm text-gray-400">Nenhum estudo concluído neste mês.</Text>
      ) : (
        <View className="px-4">
          <BarChart
            data={chartData}
            height={160}
            barWidth={26}
            spacing={18}
            initialSpacing={10}
            noOfSections={4}
            yAxisThickness={0}
            xAxisThickness={0}
            yAxisTextStyle={{ color: tokens.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: tokens.textMuted, fontSize: 10 }}
            isAnimated
          />
          <Text className="text-[11px] text-gray-400 mt-1">valores em horas (tempo planejado)</Text>
        </View>
      )}

      {/* category totals */}
      <SectionTitle>Totais por categoria</SectionTitle>
      <View className="flex-row flex-wrap px-3">
        {data && data.cats.length > 0 ? (
          data.cats.map((c) => (
            <View key={c.category} className="bg-white dark:bg-gray-800 rounded-xl p-3 m-1 flex-1 min-w-[44%]"
              style={{ borderLeftWidth: 3, borderLeftColor: categoryColorFor(null, scheme) }}>
              <Text className="text-xs text-gray-500 dark:text-gray-400">{c.category}</Text>
              <Text className="text-lg font-bold text-gray-900 dark:text-white">{formatDuration(c.minutes)}</Text>
              <Text className="text-[11px] text-gray-400">{c.sessions} sessões</Text>
            </View>
          ))
        ) : (
          <Text className="px-1 text-sm text-gray-400">Sem registros de treino/cardio/mobilidade/leitura.</Text>
        )}
      </View>

      {/* consistency */}
      <SectionTitle>Consistência (estudos)</SectionTitle>
      <View className="px-3">
        {data && data.cons.length > 0 ? (
          data.cons.map((c) => (
            <View key={c.key} className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl px-3 py-2 mb-1.5">
              <Text className="flex-1 text-sm text-gray-800 dark:text-gray-100">{c.key}</Text>
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                {c.completed}/{c.scheduled}
              </Text>
              <Text className="text-xs text-gray-400 ml-2 w-10 text-right">{c.percent}%</Text>
            </View>
          ))
        ) : (
          <Text className="px-1 text-sm text-gray-400">Sem dados de consistência.</Text>
        )}
      </View>

      {/* training volume (extra) */}
      {data && data.volume.length > 0 && (
        <>
          <SectionTitle>Volume de treino (reps no mês)</SectionTitle>
          <View className="px-3">
            {data.volume.map((v) => (
              <View key={v.exercise} className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl px-3 py-2 mb-1.5">
                <Text className="flex-1 text-sm text-gray-800 dark:text-gray-100" numberOfLines={1}>{v.exercise}</Text>
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">{v.reps}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
