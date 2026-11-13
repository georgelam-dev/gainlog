import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { fmt, fmt1, scale } from '@/lib/nutrition';
import type { EntryUnit, Food, FoodUnit } from '@/lib/types';
import { unitsFor } from '@/lib/units';

type Props = {
  visible: boolean;
  food: Food | null;
  initialGrams?: number;
  /** Set when editing an entry that was logged by unit */
  initialUnit?: EntryUnit;
  confirmLabel: string;
  onConfirm: (grams: number, unit?: EntryUnit) => void;
  onDelete?: () => void;
  onClose: () => void;
};

export function QuantitySheet(props: Props) {
  const { visible, food, initialGrams, initialUnit, onClose } = props;
  return (
    <Modal visible={visible && !!food} transparent animationType="slide" onRequestClose={onClose}>
      {food && (
        // Keyed so the form resets whenever a different food/entry is opened.
        <SheetBody
          key={`${food.id}:${initialGrams ?? ''}:${initialUnit?.label ?? ''}`}
          {...props}
          food={food}
        />
      )}
    </Modal>
  );
}

const parse = (t: string) => parseFloat(t.replace(',', '.'));
const sameUnit = (a: FoodUnit | null, b: FoodUnit | null) =>
  !!a && !!b && a.label === b.label && a.grams === b.grams;

function SheetBody({
  food,
  initialGrams,
  initialUnit,
  confirmLabel,
  onConfirm,
  onDelete,
  onClose,
}: Props & { food: Food }) {
  const { customUnits, addCustomUnit, removeCustomUnit } = useAppData();
  const custom = customUnits[food.id] ?? [];
  const units = unitsFor(food, custom);
  // Keep an edited entry's unit selectable even if it is no longer offered.
  if (initialUnit && !units.some((u) => sameUnit(u, initialUnit))) {
    units.unshift({ label: initialUnit.label, grams: initialUnit.grams });
  }

  // null = weigh in grams. New entries default to the product serving, as before.
  const [unit, setUnit] = useState<FoodUnit | null>(() => {
    if (initialUnit) return { label: initialUnit.label, grams: initialUnit.grams };
    if (initialGrams === undefined && food.servingG) return units[0];
    return null;
  });
  const [text, setText] = useState(() =>
    initialUnit ? String(initialUnit.qty) : unit ? '1' : String(Math.round(initialGrams ?? 100))
  );
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newGrams, setNewGrams] = useState('');

  const amount = parse(text);
  const valid = Number.isFinite(amount) && amount > 0;
  const grams = valid ? (unit ? amount * unit.grams : amount) : 0;
  const m = scale(food, grams);

  const selectUnit = (next: FoodUnit | null) => {
    if (next === null ? unit === null : sameUnit(next, unit)) return;
    // Switching to grams keeps the current weight; switching to a unit starts at 1.
    setText(next ? '1' : String(Math.round(grams > 0 ? grams : 100)));
    setUnit(next);
  };

  const newGramsNum = parse(newGrams);
  const newValid = newLabel.trim().length > 0 && Number.isFinite(newGramsNum) && newGramsNum > 0;
  const saveNewUnit = () => {
    if (!newValid) return;
    const u = { label: newLabel.trim(), grams: newGramsNum };
    addCustomUnit(food.id, u);
    setAdding(false);
    setNewLabel('');
    setNewGrams('');
    setUnit(u);
    setText('1');
  };

  const isCustom = (u: FoodUnit) => custom.some((c) => sameUnit(c, u));
  const presets = unit ? [0.5, 1, 2, 3] : [50, 100, 150, 200];

  return (
    // Edge-to-edge Android doesn't resize the window for the keyboard, so pad on both platforms.
    <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.name} numberOfLines={2}>
          {food.name}
        </Text>
        {food.brand && <Text style={styles.muted}>{food.brand}</Text>}

        <View style={styles.unitRow}>
          <UnitChip label="grams" active={unit === null} onPress={() => selectUnit(null)} />
          {units.map((u) => (
            <UnitChip
              key={`${u.label}:${u.grams}`}
              label={u.label}
              sub={`${fmt1(u.grams)} g`}
              active={sameUnit(u, unit)}
              onPress={() => selectUnit(u)}
              onLongPress={
                isCustom(u)
                  ? () => {
                      removeCustomUnit(food.id, u.label);
                      if (sameUnit(u, unit)) selectUnit(null);
                    }
                  : undefined
              }
            />
          ))}
          <UnitChip label="+ Custom" active={adding} onPress={() => setAdding((v) => !v)} />
        </View>

        {adding && (
          <View style={styles.customBox}>
            <View style={styles.inputRow}>
              <Text style={styles.unit}>1</Text>
              <TextInput
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="unit, e.g. scoop"
                placeholderTextColor={colors.muted}
                autoFocus
                style={[styles.smallInput, { flex: 2 }]}
                accessibilityLabel="Custom unit name"
              />
              <Text style={styles.unit}>=</Text>
              <TextInput
                value={newGrams}
                onChangeText={setNewGrams}
                placeholder="30"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={[styles.smallInput, { flex: 1 }]}
                accessibilityLabel="Grams per custom unit"
              />
              <Text style={styles.unit}>g</Text>
            </View>
            <Pressable
              style={[styles.secondaryBtn, !newValid && { opacity: 0.4 }]}
              disabled={!newValid}
              onPress={saveNewUnit}>
              <Text style={styles.secondaryText}>Save unit</Text>
            </Pressable>
            <Text style={styles.hint}>Long-press a custom unit to delete it.</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            selectTextOnFocus
            style={styles.input}
            accessibilityLabel={unit ? `Number of ${unit.label}` : 'Amount in grams'}
          />
          <Text style={styles.unit} numberOfLines={1}>
            {unit ? `× ${unit.label}` : 'g'}
          </Text>
        </View>
        {unit && valid && <Text style={styles.muted}>= {fmt1(grams)} g</Text>}

        <View style={styles.presets}>
          {presets.map((p) => (
            <Pressable key={p} style={styles.chip} onPress={() => setText(String(p))}>
              <Text style={styles.chipText}>{unit ? (p === 0.5 ? '½' : `${p}`) : `${p} g`}</Text>
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
          onPress={() => onConfirm(grams, unit ? { ...unit, qty: amount } : undefined)}>
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

function UnitChip({
  label,
  sub,
  active,
  onPress,
  onLongPress,
}: {
  label: string;
  sub?: string;
  active: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      style={[styles.unitChip, active && styles.unitChipActive]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}>
      <Text style={[styles.chipText, active && styles.unitChipTextActive]}>{label}</Text>
      {sub && <Text style={[styles.unitSub, active && styles.unitChipTextActive]}>{sub}</Text>}
    </Pressable>
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
  unit: { fontSize: 18, color: colors.muted, flexShrink: 1 },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  unitChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitChipTextActive: { color: colors.primaryText },
  unitSub: { fontSize: 11, color: colors.muted },
  customBox: { gap: 8 },
  smallInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: colors.text,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryText: { color: colors.primary, fontWeight: '700' },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center' },
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
