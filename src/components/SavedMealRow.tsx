import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { fmt, sumEntries } from '@/lib/nutrition';
import type { SavedMeal } from '@/lib/types';
import { describeAmount } from '@/lib/units';
import { Text } from '@/components/ui/Text';

type Props = {
  meal: SavedMeal;
  onPress: () => void;
  /** Optional trailing action label, e.g. "Add" */
  actionLabel?: string;
  /** Shows an "Edit" button that opens the meal editor */
  onEdit?: () => void;
};

export function SavedMealRow({ meal, onPress, actionLabel, onEdit }: Props) {
  const t = sumEntries(meal.items);
  const summary = meal.items.map((i) => `${describeAmount(i)} ${i.food.name}`).join(', ');
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
      onPress={onPress}
      accessibilityRole="button">
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {meal.name}
        </Text>
        <Text style={styles.summary} numberOfLines={2}>
          {summary || 'No items'}
        </Text>
        <Text style={styles.macros}>
          {fmt(t.kcal)} kcal · C {fmt(t.carbs)} · P {fmt(t.protein)} · F {fmt(t.fat)}
        </Text>
      </View>
      {onEdit && (
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          style={styles.editBtn}
          accessibilityLabel={`Edit ${meal.name}`}>
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      )}
      {actionLabel && <Text style={styles.action}>{actionLabel}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 12,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  summary: { fontSize: 13, color: colors.muted, marginTop: 2 },
  macros: { fontSize: 12, color: colors.muted, marginTop: 4 },
  action: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.cardAlt,
  },
  editText: { color: colors.text, fontWeight: '600', fontSize: 13 },
});
