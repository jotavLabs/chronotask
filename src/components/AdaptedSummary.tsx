import { Text, View } from 'react-native';
import type { AdaptedDay, Verdict } from '@/lib/adaptationEngine';
import { formatDuration } from '@/lib/validation';

const VERDICT: Record<Verdict, { label: string; bg: string; fg: string }> = {
  OK: { label: 'Dia normal', bg: '#D1FAE5', fg: '#065F46' },
  AJUSTADO: { label: 'Adaptado', bg: '#DBEAFE', fg: '#1E40AF' },
  CONFLITO: { label: 'Conflito', bg: '#FEE2E2', fg: '#991B1B' },
  IMPOSSIVEL: { label: 'Impossível', bg: '#FEE2E2', fg: '#7F1D1D' },
  FERIADO: { label: 'Feriado', bg: '#FEF3C7', fg: '#92400E' },
};

export function AdaptedSummary({ day }: { day: AdaptedDay }) {
  const v = VERDICT[day.verdict];

  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-3 mx-4 mb-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: v.bg }}>
            <Text className="text-xs font-bold" style={{ color: v.fg }}>
              {v.label}
            </Text>
          </View>
          <Text className="text-xs text-gray-400 dark:text-gray-500">
            {day.mode === 'FERIADO' ? 'Modo feriado' : 'Modo normal'}
          </Text>
        </View>
        {day.demand > 0 && (
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Demanda: {formatDuration(day.demand)}
          </Text>
        )}
      </View>

      {day.mode === 'FERIADO' && (
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Tempos estendidos{day.holidayName ? ` — ${day.holidayName}` : ''}. Compromissos encaixados no tempo livre, sem cortes.
        </Text>
      )}

      {day.cutsByLevel.length > 0 && (
        <View className="mt-2">
          <Text className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Cortes:</Text>
          {day.cutsByLevel.map((c) => (
            <Text key={c.cutOrder} className="text-xs text-gray-500 dark:text-gray-400">
              −{c.cut}min de {c.categories.join('/')}
              {c.fracPct < 100 ? ` (${c.fracPct}%)` : ''}
            </Text>
          ))}
        </View>
      )}

      {day.conflicts.length > 0 && (
        <View className="mt-2">
          {day.conflicts.map((c, i) => (
            <Text key={i} className="text-xs text-red-600 dark:text-red-400">
              ⚠ {c.event.title} colide com {c.anchorActivity} — remarque ou ajuste manualmente
            </Text>
          ))}
        </View>
      )}

      {day.shortfall > 0 && (
        <Text className="text-xs font-semibold text-red-700 dark:text-red-400 mt-2">
          Impossível encaixar tudo: faltam {formatDuration(day.shortfall)}. Remova ou remarque algo.
        </Text>
      )}
    </View>
  );
}
