import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { toIsoDate } from '@/lib/dayResolver';

interface Props {
  value: string; // YYYY-MM-DD ("" when unset)
  onChange: (iso: string) => void;
  placeholder?: string;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function parseIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function DateField({ value, onChange, placeholder = 'Selecionar data' }: Props) {
  const selected = parseIso(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected ?? new Date());

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function pick(day: number) {
    onChange(toIsoDate(new Date(year, month, day)));
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
      >
        <Text className={value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
          {selected ? format(selected, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setOpen(false)}
          className="flex-1 items-center justify-center bg-black/50 px-8"
        >
          <TouchableOpacity activeOpacity={1} className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4">
            {/* month nav */}
            <View className="flex-row items-center justify-between mb-3">
              <TouchableOpacity onPress={() => setView(new Date(year, month - 1, 1))} hitSlop={12} className="px-2">
                <Text className="text-xl text-blue-600">‹</Text>
              </TouchableOpacity>
              <Text className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                {format(view, 'MMMM yyyy', { locale: ptBR })}
              </Text>
              <TouchableOpacity onPress={() => setView(new Date(year, month + 1, 1))} hitSlop={12} className="px-2">
                <Text className="text-xl text-blue-600">›</Text>
              </TouchableOpacity>
            </View>

            {/* weekday header */}
            <View className="flex-row">
              {WEEKDAYS.map((w, i) => (
                <View key={i} className="flex-1 items-center py-1">
                  <Text className="text-xs text-gray-400">{w}</Text>
                </View>
              ))}
            </View>

            {/* day grid */}
            <View className="flex-row flex-wrap">
              {cells.map((day, i) => {
                const isSelected =
                  day !== null &&
                  selected != null &&
                  selected.getFullYear() === year &&
                  selected.getMonth() === month &&
                  selected.getDate() === day;
                return (
                  <View key={i} style={{ width: `${100 / 7}%` }} className="items-center py-1">
                    {day === null ? (
                      <View className="w-9 h-9" />
                    ) : (
                      <TouchableOpacity
                        onPress={() => pick(day)}
                        className={`w-9 h-9 items-center justify-center rounded-full ${
                          isSelected ? 'bg-blue-600' : ''
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            isSelected ? 'text-white font-semibold' : 'text-gray-800 dark:text-gray-100'
                          }`}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
