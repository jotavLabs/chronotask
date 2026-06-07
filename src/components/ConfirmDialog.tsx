import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/50 px-8">
        <View className="w-full bg-white dark:bg-gray-800 rounded-2xl p-5">
          <Text className="text-base font-semibold text-gray-900 dark:text-white">{title}</Text>
          {message ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2">{message}</Text>
          ) : null}
          <View className="flex-row justify-end mt-5">
            <TouchableOpacity onPress={onCancel} className="px-4 py-2 mr-2">
              <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {cancelLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              className="px-4 py-2 rounded-lg"
              style={{ backgroundColor: destructive ? '#EF4444' : '#3B82F6' }}
            >
              <Text className="text-sm font-semibold text-white">{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
