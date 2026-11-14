import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { makeId } from '@/lib/date';
import { fmt, kcalFromGrams } from '@/lib/nutrition';
import type { EntryUnit, Food } from '@/lib/types';

/** Quick adds are stored as one 100 g "serving" so normal scaling/editing keeps working. */
export const QUICK_SERVING: EntryUnit = { label: 'serving', grams: 100, qty: 1 };

type Props = {
  visible: boolean;
  confirmLabel: string;
  onConfirm: (food: Food, grams: number, unit: EntryUnit) => void;
  onClose: () => void;
};

export function QuickAddSheet({ visible, onClose, ...rest }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {visible && <Body onClose={onClose} {...rest} />}
    </Modal>
  );
}

const parse = (t: string) => {
  const n = parseFloat(t.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

function Body({ confirmLabel, onConfirm, onClose }: Omit<Props, 'visible'>) {
  const [name, setName] = useState('');
  const [kcalText, setKcalText] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const p = parse(protein);
  const c = parse(carbs);
  const f = parse(fat);
  const fromMacros = kcalFromGrams(c, p, f);
  // Calories are optional: if left blank, derive them from the macros.
  const kcal = kcalText.trim() ? parse(kcalText) : fromMacros;
  const valid = kcal > 0 || p + c + f > 0;

  const submit = () => {
    if (!valid) return;
    const food: Food = {
      id: `quick:${makeId()}`,
      name: name.trim() || 'Quick add',
      per100g: { kcal, protein: p, carbs: c, fat: f },
      nutrients: {},
      servingG: QUICK_SERVING.grams,
      servingLabel: QUICK_SERVING.label,
      quick: true,
    };
    onConfirm(food, QUICK_SERVING.grams, QUICK_SERVING);
  };

  return (
    <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Quick add</Text>
        <Text style={styles.muted}>Log calories and macros without looking up a food.</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name (optional), e.g. Restaurant burrito"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Field
          label="Calories"
          unit="kcal"
          value={kcalText}
          onChange={setKcalText}
          placeholder={fromMacros > 0 ? fmt(fromMacros) : '0'}
          hint={
            !kcalText.trim() && fromMacros > 0
              ? `${fmt(fromMacros)} kcal from macros`
              : 'Leave blank to work it out from macros'
          }
          large
          autoFocus
        />
        <View style={styles.row}>
          <Field label="Protein" unit="g" value={protein} onChange={setProtein} color={colors.protein} style={styles.cell} />
          <Field label="Carbs" unit="g" value={carbs} onChange={setCarbs} color={colors.carbs} style={styles.cell} />
          <Field label="Fat" unit="g" value={fat} onChange={setFat} color={colors.fat} style={styles.cell} />
        </View>

        <Pressable
          style={[styles.primaryBtn, !valid && { opacity: 0.4 }]}
          disabled={!valid}
          onPress={submit}>
          <Text style={styles.primaryText}>{confirmLabel}</Text>
        </Pressable>
        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.muted}>Cancel</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  unit,
  value,
  onChange,
  placeholder = '0',
  color,
  autoFocus,
  hint,
  large,
  style,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  color?: string;
  autoFocus?: boolean;
  hint?: string;
  large?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={[styles.label, color ? { color } : null]}>{label}</Text>
      <View style={styles.fieldRow}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          autoFocus={autoFocus}
          style={[styles.input, styles.fieldInput, large && styles.inputLarge]}
          accessibilityLabel={`${label} in ${unit}`}
        />
        <Text style={styles.muted}>{unit}</Text>
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}
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
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  row: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1 },
  // No flex here: in the vertical sheet, flex: 1 collapsed the Calories field so it overlapped the macros.
  field: { gap: 6 },
  fieldInput: { flex: 1, minWidth: 0 },
  inputLarge: { fontSize: 22, fontWeight: '700', paddingVertical: 12 },
  hint: { fontSize: 12, color: colors.muted },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius / 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 4 },
});
