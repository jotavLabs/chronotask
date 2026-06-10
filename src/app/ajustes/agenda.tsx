import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import {
  getAgendaAutoImport,
  getAgendaCalendarIds,
  getAgendaLastImportAt,
  setAgendaAutoImport,
  setAgendaCalendarIds,
} from '@/repositories/settingsRepo';
import { importAgenda, listDeviceCalendars, requestCalendarAccess } from '@/services/calendarService';
import type { DeviceCalendar } from '@/services/calendarService';

function Card({ children }: { children: React.ReactNode }) {
  return <View className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">{children}</View>;
}

function fmt(iso: string | null): string {
  if (!iso) return 'nunca';
  const [date, time] = iso.split('T');
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y} ${time?.slice(0, 5) ?? ''}`;
}

export default function AgendaScreen() {
  const [perm, setPerm] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [calendars, setCalendars] = useState<DeviceCalendar[]>([]);
  const [selected, setSelected] = useState<string[]>(() => getAgendaCalendarIds());
  const [autoImport, setAuto] = useState<boolean>(() => getAgendaAutoImport());
  const [lastImport, setLastImport] = useState<string | null>(() => getAgendaLastImportAt());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const granted = await requestCalendarAccess();
      if (!granted) {
        setPerm('denied');
        setLoading(false);
        return;
      }
      setPerm('granted');
      try {
        setCalendars(await listDeviceCalendars());
      } catch {
        setCalendars([]);
      }
      setLoading(false);
    })();
  }, []);

  function toggleCalendar(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    setAgendaCalendarIds(next);
  }

  function toggleAuto(v: boolean) {
    setAuto(v);
    setAgendaAutoImport(v);
  }

  async function onSync() {
    if (selected.length === 0) {
      Alert.alert('Selecione um calendário', 'Marque ao menos um calendário para importar.');
      return;
    }
    setBusy(true);
    const r = await importAgenda();
    setBusy(false);
    if (!r.ok) {
      Alert.alert('Não foi possível importar', r.error);
      return;
    }
    setLastImport(getAgendaLastImportAt());
    Alert.alert(
      'Agenda importada',
      `${r.total} compromisso(s) lidos: ${r.inserted} novo(s), ${r.updated} atualizado(s).`,
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator />
      </View>
    );
  }

  if (perm === 'denied') {
    return (
      <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
        <Card>
          <View className="p-4">
            <Text className="text-sm text-gray-800 dark:text-gray-100 font-medium mb-1">Sem acesso à agenda</Text>
            <Text className="text-[13px] text-gray-500 dark:text-gray-400 leading-5">
              Permita o acesso ao calendário nas configurações do sistema para importar seus compromissos (inclui a conta
              Google já sincronizada no aparelho).
            </Text>
          </View>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-2 px-1">Calendários</Text>
      <Card>
        {calendars.length === 0 ? (
          <Text className="text-sm text-gray-500 dark:text-gray-400 p-4">Nenhum calendário encontrado no aparelho.</Text>
        ) : (
          calendars.map((c, i) => {
            const on = selected.includes(c.id);
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => toggleCalendar(c.id)}
                className={`flex-row items-center px-4 py-3 ${
                  i < calendars.length - 1 ? 'border-b border-gray-100 dark:border-gray-700/50' : ''
                }`}
              >
                <View className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: c.color ?? '#9ca3af' }} />
                <View className="flex-1">
                  <Text className="text-sm text-gray-800 dark:text-gray-100">{c.title}</Text>
                  {!!c.source && <Text className="text-[11px] text-gray-400 dark:text-gray-500">{c.source}</Text>}
                </View>
                {on && <Text className="text-blue-600 dark:text-blue-400 text-base font-bold">✓</Text>}
              </TouchableOpacity>
            );
          })
        )}
      </Card>

      <View className="mt-5">
        <Card>
          <View className="flex-row items-center justify-between px-4 py-3">
            <View className="flex-1 pr-3">
              <Text className="text-sm text-gray-800 dark:text-gray-100">Importar ao abrir o app</Text>
              <Text className="text-[11px] text-gray-400 dark:text-gray-500">Atualiza os compromissos automaticamente</Text>
            </View>
            <Switch value={autoImport} onValueChange={toggleAuto} />
          </View>
        </Card>
      </View>

      <TouchableOpacity
        onPress={onSync}
        disabled={busy}
        className={`mt-5 rounded-xl py-3.5 items-center flex-row justify-center ${busy ? 'bg-blue-400' : 'bg-blue-600'}`}
      >
        {busy && <ActivityIndicator color="#fff" className="mr-2" />}
        <Text className="text-white font-semibold text-base">{busy ? 'Importando…' : 'Sincronizar agenda agora'}</Text>
      </TouchableOpacity>

      <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-4 px-1 leading-4">
        Leitura dos próximos 14 dias, somente leitura — o app nunca altera seu calendário. Última importação: {fmt(lastImport)}.
      </Text>
    </ScrollView>
  );
}
