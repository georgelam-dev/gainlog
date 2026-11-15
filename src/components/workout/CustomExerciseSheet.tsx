import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, spacing, fonts } from '@/constants/theme';
import { capitalize, EQUIPMENT, MUSCLES } from '@/lib/exercises';
import type { Exercise } from '@/lib/workoutTypes';
import { Text, TextInput } from '@/components/ui/Text';

type Props = {
  visible: boolean;
  initialName?: string;
  onCreate: (e: Omit<Exercise, 'id' | 'custom'>) => void;
  onClose: () => void;
};

export function CustomExerciseSheet({ visible, onClose, ...rest }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {visible && <Body onClose={onClose} {...rest} />}
    </Modal>
  );
}

function Body({ initialName = '', onCreate, onClose }: Omit<Props, 'visible'>) {
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const valid = name.trim().length > 0 && muscle !== null;

  return (
    <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>New exercise</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name, e.g. Landmine press"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoFocus
        />
        <Text style={styles.label}>Main muscle</Text>
        <Chips options={MUSCLES} value={muscle} onChange={setMuscle} />
        <Text style={styles.label}>Equipment (optional)</Text>
        <Chips options={EQUIPMENT} value={equipment} onChange={(v) => setEquipment(v === equipment ? null : v)} />

        <Pressable
          style={[styles.primaryBtn, !valid && { opacity: 0.4 }]}
          disabled={!valid}
          onPress={() =>
            muscle &&
            onCreate({ name: name.trim(), muscle, equipment: equipment ?? undefined, category: 'strength' })
          }>
          <Text style={styles.primaryText}>Create exercise</Text>
        </Pressable>
        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.muted}>Cancel</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {options.map((o) => (
        <Pressable key={o} onPress={() => onChange(o)} style={[styles.chip, value === o && styles.chipOn]}>
          <Text style={[styles.chipText, value === o && styles.chipTextOn]}>{capitalize(o)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius * 1.2,
    borderTopRightRadius: radius * 1.2,
    padding: spacing,
    paddingBottom: spacing * 2,
    gap: 12,
  },
  title: { fontFamily: fonts.display, fontSize: 24, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius / 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.track },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  chipTextOn: { color: colors.primaryText },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 4 },
});
