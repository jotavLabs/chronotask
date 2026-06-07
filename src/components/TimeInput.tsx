import { TextInput } from 'react-native';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Masked HH:MM input: digits auto-format to "08:30" as the user types. */
export function TimeInput({ value, onChange, placeholder = 'HH:MM' }: Props) {
  function handle(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    const out = digits.length >= 3 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
    onChange(out);
  }

  return (
    <TextInput
      value={value}
      onChangeText={handle}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType="number-pad"
      maxLength={5}
      className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
    />
  );
}
