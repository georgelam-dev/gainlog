import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';

export type MenuAction = { label: string; onPress: () => void; destructive?: boolean };

type Props = {
  visible: boolean;
  title?: string;
  actions: MenuAction[];
  onClose: () => void;
};

/** Bottom-sheet action list (Android alerts cap out at three buttons). */
export function ActionMenu({ visible, title, actions, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing }]}>
          {title && <Text style={styles.title}>{title}</Text>}
          {actions.map((a) => (
            <Pressable
              key={a.label}
              style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.cardAlt }]}
              onPress={() => {
                onClose();
                a.onPress();
              }}>
              <Text style={[styles.itemText, a.destructive && { color: colors.danger }]}>
                {a.label}
              </Text>
            </Pressable>
          ))}
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius * 1.2,
    borderTopRightRadius: radius * 1.2,
    paddingTop: spacing,
    paddingHorizontal: spacing,
    gap: 4,
  },
  title: { fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 8 },
  item: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: radius / 2 },
  itemText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  cancel: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  cancelText: { fontSize: 15, color: colors.muted },
});
