import { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CheckBox } from '@/components/CheckBox';
import type { BlockWithCategory } from '@/repositories/blocksRepo';
import { getBlockNote, setBlockNote } from '@/repositories/completionsRepo';

interface Props {
  block: BlockWithCategory;
  date: string; // ISO
  done: boolean;
  onToggle: () => void;
  color: string;
  onEditBlock?: () => void;
  onDeleteBlock?: () => void;
}

const INPUT =
  'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800';

export function StudyNoteCard({ block, date, done, onToggle, color, onEditBlock, onDeleteBlock }: Props) {
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const n = getBlockNote(date, block.id) ?? '';
    setNote(n);
    setSaved(n);
    setEditing(false);
  }, [date, block.id]);

  function save() {
    setBlockNote(date, block.id, note);
    setSaved(note.trim());
    setEditing(false);
  }

  return (
    <View
      className={`bg-white dark:bg-gray-800 rounded-xl p-3 mb-2 mx-3 ${done ? 'opacity-60' : ''}`}
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <View className="flex-row items-center">
        <View className="flex-1 mr-2">
          <Text className={`text-sm font-medium text-gray-800 dark:text-gray-100 ${done ? 'line-through' : ''}`}>
            {block.activity}
          </Text>
          <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {block.start} – {block.end}
            {block.note ? ` · ${block.note}` : ''}
          </Text>
        </View>
        {onEditBlock && (
          <TouchableOpacity onPress={onEditBlock} hitSlop={8} className="px-1.5">
            <Text className="text-sm">✏️</Text>
          </TouchableOpacity>
        )}
        {onDeleteBlock && (
          <TouchableOpacity onPress={onDeleteBlock} hitSlop={8} className="px-1.5 mr-1">
            <Text className="text-sm">🗑️</Text>
          </TouchableOpacity>
        )}
        <CheckBox checked={done} onToggle={onToggle} color={color} />
      </View>

      {editing ? (
        <View className="mt-2">
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="O que você estudou nesta sessão?"
            placeholderTextColor="#9CA3AF"
            multiline
            className={INPUT}
            style={{ minHeight: 56, textAlignVertical: 'top' }}
          />
          <View className="flex-row justify-end mt-1">
            <TouchableOpacity onPress={() => setEditing(false)} className="px-3 py-1.5 mr-1">
              <Text className="text-xs text-gray-500 dark:text-gray-400">Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={save} className="px-3 py-1.5 rounded-lg bg-blue-600">
              <Text className="text-xs font-semibold text-white">Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : saved ? (
        <TouchableOpacity onPress={() => setEditing(true)} className="mt-2">
          <Text className="text-xs text-gray-600 dark:text-gray-300 italic">{saved}</Text>
          <Text className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">editar anotação</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => setEditing(true)} className="mt-2">
          <Text className="text-xs text-blue-600 dark:text-blue-400">+ anotar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
