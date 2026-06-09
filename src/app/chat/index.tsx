import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COMMAND_LIST, parseCommand } from '@/lib/commands';
import { buildCommandDeps } from '@/repositories/commandDeps';

type Message = { id: number; role: 'user' | 'system'; lines: string[] };

let nextId = 1;

const GREETING: Message = {
  id: 0,
  role: 'system',
  lines: [
    'Olá! Digite um comando começando com "/". Ex.: /hoje, /treino, /feriados, /tempo ingles.',
    'Digite /ajuda para ver tudo.',
  ],
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  const suggestions = input.startsWith('/')
    ? COMMAND_LIST.filter((c) => c.startsWith(input.trim().split(' ')[0])).slice(0, 5)
    : [];

  function send() {
    const text = input.trim();
    if (!text) return;
    const user: Message = { id: nextId++, role: 'user', lines: [text] };
    const result = parseCommand(text, buildCommandDeps());
    const system: Message = { id: nextId++, role: 'system', lines: result.lines };
    setMessages((prev) => [...prev, user, system]);
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
    >
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 12 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isUser = item.role === 'user';
            return (
              <View className={`my-1 max-w-[85%] ${isUser ? 'self-end' : 'self-start'}`}>
                <View
                  className={`rounded-2xl px-3 py-2 ${
                    isUser ? 'bg-blue-600 rounded-br-md' : 'bg-white dark:bg-gray-800 rounded-bl-md'
                  }`}
                >
                  {item.lines.map((l, i) => (
                    <Text
                      key={i}
                      className={`text-sm ${isUser ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}
                    >
                      {l}
                    </Text>
                  ))}
                </View>
              </View>
            );
          }}
        />

        {suggestions.length > 0 && (
          <View className="flex-row flex-wrap px-3 pb-1">
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setInput(s)}
                className="px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 mr-1 mb-1"
              >
                <Text className="text-xs text-gray-700 dark:text-gray-200">{s.trim()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View
          className="flex-row items-center px-3 pt-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          style={{ paddingBottom: Math.max(insets.bottom, 8) }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Digite um comando, ex.: /ajuda"
            placeholderTextColor="#9CA3AF"
            onSubmitEditing={send}
            returnKeyType="send"
            className="flex-1 h-11 px-4 rounded-full border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
          />
          <TouchableOpacity
            onPress={send}
            className="ml-2 w-11 h-11 rounded-full bg-blue-600 items-center justify-center"
          >
            <Text className="text-white text-lg">➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
