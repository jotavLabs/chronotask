import { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { periodStartIso } from '@/lib/scheduling';
import { setAssignment } from '@/repositories/assignmentsRepo';
import { getModels } from '@/repositories/modelsRepo';
import { getRotationRow } from '@/repositories/rotationRepo';
import { getResolutionForDate } from '@/repositories/schedulingRepo';

/**
 * On app open, when no model is defined for the current period (no rotation loop and
 * no assignment) and there are multiple models to choose from, asks which routine to
 * use this week/month. The choice becomes a week assignment. "Decidir depois" keeps
 * the fallback (last used) — the prompt returns next launch while unanswered.
 */
export function WeekPrompt() {
  const { tokens } = useTheme();
  const period = getRotationRow()?.period === 'monthly' ? 'monthly' : 'weekly';
  const models = getModels();
  const [visible, setVisible] = useState(
    () => models.length >= 2 && getResolutionForDate(new Date()).source === 'none',
  );

  if (!visible) return null;
  const ps = periodStartIso(new Date(), period);

  function choose(id: number) {
    setAssignment(ps, id);
    setVisible(false);
  }

  return (
    <Modal transparent visible statusBarTranslucent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: tokens.surface, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: tokens.border, maxHeight: '80%' }}>
          <Text style={{ color: tokens.text, fontSize: 19, fontWeight: '700', marginBottom: 6 }}>
            Qual rotina usar {period === 'monthly' ? 'neste mês' : 'nesta semana'}?
          </Text>
          <Text style={{ color: tokens.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
            Nenhum modelo está definido para este período. Escolha um para aplicar.
          </Text>

          <ScrollView style={{ flexGrow: 0 }}>
            {models.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => choose(m.id)}
                style={{ paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, backgroundColor: tokens.surfaceAlt, marginBottom: 8 }}
              >
                <Text style={{ color: tokens.text, fontSize: 15, fontWeight: '600' }}>{m.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity onPress={() => setVisible(false)} style={{ paddingVertical: 12, alignItems: 'center', marginTop: 4 }}>
            <Text style={{ color: tokens.textMuted, fontSize: 14, fontWeight: '600' }}>Decidir depois</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
