import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSyncStore } from '@/store/syncStore';

function Card({ children }: { children: React.ReactNode }) {
  return <View className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden p-4">{children}</View>;
}

function fmt(iso: string | null): string {
  if (!iso) return 'nunca';
  const [date, time] = iso.split('T');
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y} ${time?.slice(0, 5) ?? ''}`;
}

export default function ContaScreen() {
  const { configured, account, status, lastSyncAt, lastError, refresh, signIn, signOut, syncNow } = useSyncStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSignIn() {
    if (!email.trim() || !password) {
      Alert.alert('Dados incompletos', 'Informe e-mail e senha.');
      return;
    }
    setBusy(true);
    const r = await signIn(email, password);
    setBusy(false);
    if (!r.ok) Alert.alert('Não foi possível entrar', r.error ?? 'Verifique as credenciais.');
    else setPassword('');
  }

  function onSignOut() {
    Alert.alert('Sair da conta?', 'Seus dados continuam salvos neste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  if (!configured) {
    return (
      <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
        <Card>
          <Text className="text-sm text-gray-800 dark:text-gray-100 font-medium mb-1">Sincronização não configurada</Text>
          <Text className="text-[13px] text-gray-500 dark:text-gray-400 leading-5">
            Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no arquivo .env (veja .env.example) e reinicie o app.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      {account ? (
        <>
          <Card>
            <Text className="text-xs text-gray-400 dark:text-gray-500 mb-1">Conectado como</Text>
            <Text className="text-base text-gray-900 dark:text-gray-100 font-medium">{account.email ?? account.id}</Text>
            <Text className="text-[13px] text-gray-500 dark:text-gray-400 mt-3">
              Última sincronização: {fmt(lastSyncAt)}
            </Text>
            {lastError && <Text className="text-[13px] text-red-500 mt-2">Erro: {lastError}</Text>}
          </Card>

          <TouchableOpacity
            onPress={() => void syncNow()}
            disabled={status === 'syncing'}
            className={`mt-4 rounded-xl py-3.5 items-center flex-row justify-center ${
              status === 'syncing' ? 'bg-blue-400' : 'bg-blue-600'
            }`}
          >
            {status === 'syncing' && <ActivityIndicator color="#fff" className="mr-2" />}
            <Text className="text-white font-semibold text-base">
              {status === 'syncing' ? 'Sincronizando…' : 'Sincronizar agora'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onSignOut} className="mt-3 rounded-xl py-3.5 items-center border border-gray-300 dark:border-gray-600">
            <Text className="text-gray-700 dark:text-gray-200 font-medium text-base">Sair da conta</Text>
          </TouchableOpacity>

          <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-4 px-1 leading-4">
            O app é local-first: a nuvem é um espelho. Em conflito, vence a edição mais recente (last-write-wins).
          </Text>
        </>
      ) : (
        <>
          <Card>
            <Text className="text-xs text-gray-400 dark:text-gray-500 mb-1">E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              placeholderTextColor="#9ca3af"
              className="text-base text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4"
            />
            <Text className="text-xs text-gray-400 dark:text-gray-500 mb-1">Senha</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              className="text-base text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2"
            />
          </Card>

          <TouchableOpacity
            onPress={onSignIn}
            disabled={busy}
            className={`mt-4 rounded-xl py-3.5 items-center flex-row justify-center ${busy ? 'bg-blue-400' : 'bg-blue-600'}`}
          >
            {busy && <ActivityIndicator color="#fff" className="mr-2" />}
            <Text className="text-white font-semibold text-base">{busy ? 'Entrando…' : 'Entrar'}</Text>
          </TouchableOpacity>

          <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-4 px-1 leading-4">
            Use a conta que você criou no Supabase. As credenciais ficam apenas neste aparelho.
          </Text>
        </>
      )}
    </ScrollView>
  );
}
