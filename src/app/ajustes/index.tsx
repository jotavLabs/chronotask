import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import type { Href } from 'expo-router';
import type { NotifPrefs, NotifScope } from '@/lib/notifications';
import { THEME_MODES } from '@/lib/theme';
import { findModelRedundantIds, removeBlocks } from '@/repositories/blocksRepo';
import { getEditingModelId, getModelById } from '@/repositories/modelsRepo';
import { getLastBackupAt, getNotifPrefs, setNotifPrefs } from '@/repositories/settingsRepo';
import { clearExampleData } from '@/repositories/templatesRepo';
import { applyBackup, exportBackup, pickBackup } from '@/services/backupService';
import { requestNotifPermission, rescheduleNotifications } from '@/services/notificationService';
import { useTabsStore } from '@/store/tabsStore';
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
  const showTraining = useTabsStore((s) => s.showTraining);
  const showStudies = useTabsStore((s) => s.showStudies);
  const setShowTraining = useTabsStore((s) => s.setShowTraining);
  const setShowStudies = useTabsStore((s) => s.setShowStudies);
  const [notif, setNotif] = useState<NotifPrefs>(() => getNotifPrefs());
  const [lastBackup, setLastBackup] = useState<string | null>(() => getLastBackupAt());

  function update(patch: Partial<NotifPrefs>) {
    const next = { ...notif, ...patch };
    setNotif(next);
    setNotifPrefs(next);
    void rescheduleNotifications();
  }

  async function onExport() {
    const r = await exportBackup();
    if (r.ok) setLastBackup(getLastBackupAt());
    else Alert.alert('Erro', r.error ?? 'Falha ao exportar.');
  }

  async function onImport() {
    const r = await pickBackup();
    if (r.canceled) return;
    if (!r.ok) {
      Alert.alert('Arquivo inválido', r.error);
      return;
    }
    Alert.alert('Importar backup?', 'Isso substitui TODOS os dados atuais. Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Importar',
        style: 'destructive',
        onPress: () => {
          try {
            applyBackup(r.file.data);
            useThemeStore.getState().init();
            setNotif(getNotifPrefs());
            setLastBackup(getLastBackupAt());
            void rescheduleNotifications();
            Alert.alert('Pronto', 'Dados restaurados. Navegue pelas abas para ver tudo atualizado.');
          } catch {
            Alert.alert('Erro', 'Falha ao restaurar o backup.');
          }
        },
      },
    ]);
  }

  function onRemoveOverflow() {
    const modelId = getEditingModelId();
    const name = getModelById(modelId)?.name ?? 'modelo';
    const ids = findModelRedundantIds(modelId);
    if (ids.length === 0) {
      Alert.alert('Tudo certo', `Nenhum bloco sobreposto ou fora da janela do dia em "${name}".`);
      return;
    }
    Alert.alert(
      'Remover blocos que sobram?',
      `Encontrei ${ids.length} bloco(s) sobreposto(s) ou fora da janela do dia em "${name}" — é o que aparece "cortado hoje" (esmaecido). Remover?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            removeBlocks(ids);
            Alert.alert('Pronto', `${ids.length} bloco(s) removido(s). Abra as abas para conferir.`);
          },
        },
      ],
    );
  }

  function onClearExample() {
    Alert.alert(
      'Limpar dados de exemplo?',
      'Apaga blocos da rotina, rotinas mensais, treinos e estudos deste aparelho. Categorias, feriados e preferências são mantidos. Não pode ser desfeito.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: () => {
            clearExampleData();
            Alert.alert('Pronto', 'Dados de exemplo removidos. Use "Trocar/redefinir ponto de partida" para começar a sua rotina.');
          },
        },
      ],
    );
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

      <SectionTitle>Abas</SectionTitle>
      <Card>
        <SwitchRow label="Mostrar aba Treino" value={showTraining} onValueChange={setShowTraining} />
        <SwitchRow label="Mostrar aba Estudos" value={showStudies} onValueChange={setShowStudies} />
      </Card>
      <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 px-1">
        Treino e Estudos ficam ocultos por padrão. Ative para exibi-los na barra inferior.
      </Text>

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
        <LinkRow href={'/ajustes/inicio' as Href} icon="🧩" label="Trocar/redefinir ponto de partida" />
        <TouchableOpacity onPress={onRemoveOverflow} className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
          <Text className="text-base mr-3">✂️</Text>
          <Text className="flex-1 text-sm text-gray-800 dark:text-gray-100">Remover blocos que sobram do dia</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClearExample} className="flex-row items-center px-4 py-3">
          <Text className="text-base mr-3">🧹</Text>
          <Text className="flex-1 text-sm text-red-500">Limpar dados de exemplo</Text>
        </TouchableOpacity>
      </Card>

      <SectionTitle>Backup</SectionTitle>
      <Card>
        <TouchableOpacity onPress={onExport} className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
          <Text className="text-base mr-3">⬆️</Text>
          <Text className="flex-1 text-sm text-gray-800 dark:text-gray-100">Exportar dados</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onImport} className="flex-row items-center px-4 py-3">
          <Text className="text-base mr-3">⬇️</Text>
          <Text className="flex-1 text-sm text-gray-800 dark:text-gray-100">Importar dados</Text>
        </TouchableOpacity>
      </Card>
      <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 px-1">
        {lastBackup ? `Último backup: ${fmtBackup(lastBackup)}` : 'Nenhum backup ainda.'}
      </Text>
    </ScrollView>
  );
}

function fmtBackup(iso: string): string {
  const [date, time] = iso.split('T');
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y} ${time?.slice(0, 5) ?? ''}`;
}
