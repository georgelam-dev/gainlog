import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { fmt, fmt1, scale } from '@/lib/nutrition';
import type { Food } from '@/lib/types';

type Props = {
  visible: boolean;
  food: Food | null;
  initialGrams?: number;
  confirmLabel: string;
  onConfirm: (grams: number) => void;
  onDelete?: () => void;
  onClose: () => void;
};

export function QuantitySheet(props: Props) {
  const { visible, food, initialGrams, onClose } = props;
  return (
    <Modal visible={visible && !!food} transparent animationType="slide" onRequestClose={onClose}>
      {food && (
        // Keyed so the form resets whenever a different food/entry is opened.
        <SheetBody key={`${food.id}:${initialGrams ?? ''}`} {...props} food={food} />
      )}
    </Modal>
  );
}

function SheetBody({
  food,
  initialGrams,
  confirmLabel,
  onConfirm,
  onDelete,
  onClose,
}: Props & { food: Food }) {
  const [text, setText] = useState(() => String(Math.round(initialGrams ?? food.servingG ?? 100)));

  const grams = parseFloat(text.replace(',', '.'));
  const valid = Number.isFinite(grams) && grams > 0;
  const m = scale(food, valid ? grams : 0);

  const presets = [food.servingG, 50, 100, 200].filter(
    (v, i, arr): v is number => typeof v === 'number' && arr.indexOf(v) === i
  );

  return (
    <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.name} numberOfLines={2}>
            {food.name}
          </Text>
          {food.brand && <Text style={styles.muted}>{food.brand}</Text>}

          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              keyboardType="decimal-pad"
              selectTextOnFocus
              style={styles.input}
              accessibilityLabel="Amount in grams"
            />
            <Text style={styles.unit}>g</Text>
          </View>

          <View style={styles.presets}>
            {presets.map((p) => (
              <Pressable key={p} style={styles.chip} onPress={() => setText(String(Math.round(p)))}>
                <Text style={styles.chipText}>
                  {p === food.servingG ? `1 serving (${fmt(p)} g)` : `${p} g`}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.macroRow}>
            <Macro label="kcal" value={fmt(m.kcal)} />
            <Macro label="Carbs" value={`${fmt1(m.carbs)} g`} color={colors.carbs} />
            <Macro label="Protein" value={`${fmt1(m.protein)} g`} color={colors.protein} />
            <Macro label="Fat" value={`${fmt1(m.fat)} g`} color={colors.fat} />
          </View>

          <Pressable
            style={[styles.primaryBtn, !valid && { opacity: 0.4 }]}
            disabled={!valid}
            onPress={() => onConfirm(grams)}>
            <Text style={styles.primaryText}>{confirmLabel}</Text>
          </Pressable>
          {onDelete && (
            <Pressable style={styles.deleteBtn} onPress={onDelete}>
              <Text style={styles.deleteText}>Remove entry</Text>
            </Pressable>
          )}
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.muted}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
  );
}

function Macro({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[styles.macroValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
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
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 22,
    color: colors.text,
  },
  unit: { fontSize: 18, color: colors.muted },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: colors.text, fontSize: 13 },
  macroRow: { flexDirection: 'row', paddingVertical: 8 },
  macroValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  deleteBtn: { alignItems: 'center', paddingVertical: 10 },
  deleteText: { color: colors.danger, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 4 },
});
