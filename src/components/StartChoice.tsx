import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { getTemplates } from '@/lib/templates';
import type { TemplateId } from '@/lib/templates';
import { setStartChoiceDone } from '@/repositories/settingsRepo';
import { applyTemplate } from '@/repositories/templatesRepo';

const SUBTITLE: Record<TemplateId, string> = {
  generica: 'Popula uma rotina simples (trabalho, refeições, estudo, tempo livre) para você ajustar.',
  vazio: 'Começa sem blocos. Você monta tudo do zero.',
};

/** First-launch start choice. Applies the chosen template, then hands off to the app. */
export function StartChoice({ onDone }: { onDone: () => void }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const templates = getTemplates();

  function choose(id: TemplateId) {
    applyTemplate(id, { replace: false });
    setStartChoiceDone(true);
    onDone();
  }

  // generic first (recommended)
  const ordered = [...templates].sort((a) => (a.id === 'generica' ? -1 : 1));

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, paddingTop: insets.top + 40, paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}>
      <Text style={{ fontSize: 28, marginBottom: 6 }}>🗓️</Text>
      <Text style={{ color: tokens.text, fontSize: 24, fontWeight: '800', marginBottom: 8 }}>Como quer começar?</Text>
      <Text style={{ color: tokens.textMuted, fontSize: 15, lineHeight: 21, marginBottom: 28 }}>
        Escolha um ponto de partida. Dá para mudar depois em Ajustes, e tudo é editável.
      </Text>

      {ordered.map((t) => {
        const recommended = t.id === 'generica';
        return (
          <TouchableOpacity
            key={t.id}
            onPress={() => choose(t.id)}
            activeOpacity={0.85}
            style={{
              backgroundColor: tokens.surface,
              borderRadius: 16,
              padding: 18,
              marginBottom: 14,
              borderWidth: recommended ? 2 : 1,
              borderColor: recommended ? tokens.primary : tokens.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ color: tokens.text, fontSize: 17, fontWeight: '700' }}>{t.name}</Text>
              {recommended && (
                <View style={{ backgroundColor: tokens.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Recomendado</Text>
                </View>
              )}
            </View>
            <Text style={{ color: tokens.textMuted, fontSize: 13, lineHeight: 19 }}>{SUBTITLE[t.id]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
