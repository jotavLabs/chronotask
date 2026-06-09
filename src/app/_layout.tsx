import '../global.css';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, Text, View } from 'react-native';
import { db } from '@/db/client';
import { backfillTopics } from '@/db/backfillTopics';
import migrations from '@/db/migrations';
import { runSeed } from '@/db/seed';
import { seedTraining } from '@/db/seedTraining';
import { useThemeStore } from '@/store/themeStore';

// ─── web fallback (SharedArrayBuffer not available in standard dev server) ──────
function WebUnsupported() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: 32 }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>📱</Text>
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', textAlign: 'center' }}>
        App mobile
      </Text>
      <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
        Abra no celular via Expo Go{'\n'}ou em um emulador Android/iOS.
      </Text>
      <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 24 }}>
        Web não suportado — expo-sqlite requer{'\n'}SharedArrayBuffer com headers COEP/COOP.
      </Text>
    </View>
  );
}

// ─── mobile app (migrations + seed + navigation) ─────────────────────────────
function MobileApp() {
  const { success, error } = useMigrations(db, migrations);
  const seeded = useRef(false);

  useEffect(() => {
    if (success && !seeded.current) {
      seeded.current = true;
      try {
        runSeed();
        seedTraining();
        backfillTopics();
        useThemeStore.getState().init();
      } catch (e) {
        console.error('[seed]', e);
      }
    }
  }, [success]);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 24 }}>
        <Text style={{ color: '#EF4444', textAlign: 'center' }}>
          Erro na migração: {error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Iniciando…</Text>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="gerenciar" options={{ headerShown: false }} />
      <Stack.Screen name="ajustes" options={{ headerShown: false }} />
      <Stack.Screen name="estatisticas" options={{ headerShown: false }} />
      <Stack.Screen name="chat" options={{ headerShown: false }} />
    </Stack>
  );
}

// ─── root ─────────────────────────────────────────────────────────────────────
export default function RootLayout() {
  if (Platform.OS === 'web') return <WebUnsupported />;
  return <MobileApp />;
}
