import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import type { Href } from 'expo-router';
import type { NotifPrefs, NotifScope } from '@/lib/notifications';
import { THEME_MODES } from '@/lib/theme';
import { getNotifPrefs, setNotifPrefs } from '@/repositories/settingsRepo';
import { requestNotifPermission, rescheduleNotifications } from '@/services/notificationService';
import { useThemeStore } from '@/store/themeStore';

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mt-5 mb-2 px-1">
      {children}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">{children}</View>;
}

function LinkRow({ href, icon, label }: { href: Href; icon: string; label: string }) {
  return (
    <Link href={href} asChild>
      <Pressable className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 active:opacity-60">
        <Text className="text-base mr-3">{icon}</Text>
        <Text className="flex-1 text-sm text-gray-800 dark:text-gray-100">{label}</Text>
        <Text className="text-gray-300 dark:text-gray-600 text-lg">›</Text>
      </Pressable>
    </Link>
  );
}

function SwitchRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
      <Text className="text-sm text-gray-800 dark:text-gray-100">{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function Chips<T extends string | number>({
  label,
  options,
  value,
  onChange,
  render,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => string;
}) {
  return (
    <View className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
      <Text className="text-xs text-gray-400 dark:text-gray-500 mb-2">{label}</Text>
      <View className="flex-row flex-wrap">
        {options.map((opt) => {
          const selected = opt === value;
          return (
            <TouchableOpacity
              key={String(opt)}
              onPress={() => onChange(opt)}
              className={`px-3 py-1.5 rounded-full mr-2 mb-1 border ${
                selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <Text className={`text-xs font-medium ${selected ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                {render(opt)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const SCOPE_LABEL: Record<NotifScope, string> = {
  importantes: 'Importantes',
  todos: 'Todos os blocos',
  nenhum: 'Nenhum bloco',
};

export default function AjustesScreen() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const [notif, setNotif] = useState<NotifPrefs>(() => getNotifPrefs());

  function update(patch: Partial<NotifPrefs>) {
    const next = { ...notif, ...patch };
    setNotif(next);
    setNotifPrefs(next);
    void rescheduleNotifications();
  }

  async function toggleEnabled(value: boolean) {
    if (!value) {
      update({ enabled: false });
      return;
    }
    const granted = await requestNotifPermission();
    if (granted) {
      update({ enabled: true });
    } else {
      Alert.alert(
        'Permissão negada',
        'Ative as notificações nas configurações do sistema para receber lembretes.',
      );
    }
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <SectionTitle>Aparência</SectionTitle>
      <Card>
        {THEME_MODES.map((opt, i) => {
          const selected = mode === opt.mode;
          return (
            <TouchableOpacity
              key={opt.mode}
              onPress={() => setMode(opt.mode)}
              className={`flex-row items-center px-4 py-3 ${
                i < THEME_MODES.length - 1 ? 'border-b border-gray-100 dark:border-gray-700/50' : ''
              }`}
            >
              <Text className="text-base mr-3">{opt.icon}</Text>
              <Text className="flex-1 text-sm text-gray-800 dark:text-gray-100">{opt.label}</Text>
              {selected && <Text className="text-blue-600 dark:text-blue-400 text-base font-bold">✓</Text>}
            </TouchableOpacity>
          );
        })}
      </Card>

      <SectionTitle>Lembretes</SectionTitle>
      <Card>
        <SwitchRow label="Ativar lembretes" value={notif.enabled} onValueChange={toggleEnabled} />
        {notif.enabled && (
          <>
            <Chips
              label="Quais blocos notificar"
              options={['importantes', 'todos', 'nenhum'] as NotifScope[]}
              value={notif.scope}
              onChange={(scope) => update({ scope })}
              render={(s) => SCOPE_LABEL[s]}
            />
            <Chips
              label="Antecedência"
              options={[0, 5, 10, 15]}
              value={notif.leadMin}
              onChange={(leadMin) => update({ leadMin })}
              render={(n) => (n === 0 ? 'No início' : `${n} min antes`)}
            />
            <SwitchRow label="Avisos de rotinas mensais" value={notif.monthly} onValueChange={(monthly) => update({ monthly })} />
            <SwitchRow label="Resumo do dia ao acordar" value={notif.dailySummary} onValueChange={(dailySummary) => update({ dailySummary })} />
          </>
        )}
      </Card>
      <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 px-1">
        Os lembretes seguem o dia adaptado e reagendam ao abrir o app. Nada notifica durante o sono.
      </Text>

      <SectionTitle>Rotina</SectionTitle>
      <Card>
        <LinkRow href="/gerenciar" icon="🗂️" label="Gerenciar rotina e dados" />
        <LinkRow href="/gerenciar/categorias" icon="🎨" label="Categorias & prioridades" />
      </Card>
    </ScrollView>
  );
}
