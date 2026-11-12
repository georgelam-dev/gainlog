import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { fmt1, KCAL_PER_GRAM } from '@/lib/nutrition';
import type { Macros } from '@/lib/types';

const MACROS = [
  { key: 'carbs', label: 'Carbs', color: colors.carbs },
  { key: 'protein', label: 'Protein', color: colors.protein },
  { key: 'fat', label: 'Fat', color: colors.fat },
] as const;

/** Macro breakdown for a single meal: calorie-weighted colour bar + grams per macro. */
export function MealBreakdown({ totals }: { totals: Macros }) {
  const kcal = {
    carbs: totals.carbs * KCAL_PER_GRAM.carbs,
    protein: totals.protein * KCAL_PER_GRAM.protein,
    fat: totals.fat * KCAL_PER_GRAM.fat,
  };
  const hasMacros = kcal.carbs + kcal.protein + kcal.fat > 0;

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {hasMacros ? (
          MACROS.map(({ key, color }) => <View key={key} style={{ flex: kcal[key], backgroundColor: color }} />)
        ) : (
          <View style={{ flex: 1, backgroundColor: colors.track }} />
        )}
      </View>
      <View style={styles.row}>
        {MACROS.map(({ key, label, color }) => (
          <View key={key} style={styles.item}>
            <View style={styles.labelRow}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={styles.label}>{label}</Text>
            </View>
            <Text style={styles.value}>{fmt1(totals[key])} g</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.cardAlt,
    gap: 12,
  },
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 },
  row: { flexDirection: 'row' },
  item: { flex: 1, gap: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 12, color: colors.muted },
  value: { fontSize: 17, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
});
