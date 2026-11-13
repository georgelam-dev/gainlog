import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { formatDateLabel } from '@/lib/date';
import { fmt, macroTargets, sumEntries } from '@/lib/nutrition';
import type { LogEntry, NutrientKey } from '@/lib/types';

type Unit = 'g' | 'mg' | 'µg';
const PER_GRAM: Record<Unit, number> = { g: 1, mg: 1000, 'µg': 1_000_000 };

type Row = {
  key: 'protein' | 'carbs' | 'fat' | NutrientKey;
  label: string;
  unit: Unit;
  /** FDA adult Daily Value, in `unit`. Macros use the user's own targets instead. */
  dv?: number;
  sub?: boolean;
  color?: string;
};

const ROWS: Row[] = [
  { key: 'protein', label: 'Protein', unit: 'g', color: colors.protein },
  { key: 'carbs', label: 'Carbohydrates', unit: 'g', color: colors.carbs },
  { key: 'fiber', label: 'Fiber', unit: 'g', dv: 28, sub: true },
  { key: 'sugars', label: 'Sugar', unit: 'g', sub: true },
  { key: 'fat', label: 'Fat', unit: 'g', color: colors.fat },
  { key: 'saturatedFat', label: 'Saturated fat', unit: 'g', dv: 20, sub: true },
  { key: 'monoFat', label: 'Monounsaturated fat', unit: 'g', sub: true },
  { key: 'transFat', label: 'Trans fat', unit: 'g', sub: true },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', dv: 300 },
  { key: 'sodium', label: 'Sodium', unit: 'mg', dv: 2300 },
  { key: 'potassium', label: 'Potassium', unit: 'mg', dv: 4700 },
  { key: 'vitaminA', label: 'Vitamin A', unit: 'µg', dv: 900 },
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg', dv: 90 },
  { key: 'calcium', label: 'Calcium', unit: 'mg', dv: 1300 },
  { key: 'iron', label: 'Iron', unit: 'mg', dv: 18 },
];

const isMacro = (k: Row['key']): k is 'protein' | 'carbs' | 'fat' =>
  k === 'protein' || k === 'carbs' || k === 'fat';

/** Total grams of a nutrient, plus how many entries actually report it. */
function totalFor(entries: LogEntry[], key: NutrientKey) {
  let grams = 0;
  let reported = 0;
  for (const e of entries) {
    const v = e.food.nutrients?.[key];
    if (v === undefined) continue;
    grams += (v * e.grams) / 100;
    reported++;
  }
  return { grams, reported };
}

function fmtAmount(v: number, unit: Unit): string {
  const r = v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${r} ${unit}`;
}

export default function NutritionScreen() {
  const { entries, settings, selectedDate } = useAppData();
  const totals = useMemo(() => sumEntries(entries), [entries]);
  const targets = useMemo(() => macroTargets(settings), [settings]);

  const n = entries.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: `Nutrition · ${formatDateLabel(selectedDate)}` }} />

      <View style={styles.card}>
        <Text style={styles.kcal}>
          {fmt(totals.kcal)} <Text style={styles.kcalGoal}>/ {fmt(targets.kcal)} kcal</Text>
        </Text>
        <Text style={styles.muted}>
          {n} food{n === 1 ? '' : 's'} logged
        </Text>
      </View>

      <View style={styles.card}>
        {ROWS.map((row, i) => {
          const macro = isMacro(row.key);
          const { grams, reported } = macro
            ? { grams: totals[row.key as 'protein'], reported: n }
            : totalFor(entries, row.key as NutrientKey);
          const value = grams * PER_GRAM[row.unit];
          const target = macro ? targets[row.key as 'protein'] : row.dv;
          const pct = target ? value / target : undefined;
          const noData = n > 0 && reported === 0;

          return (
            <View
              key={row.key}
              style={[styles.row, i > 0 && styles.rowBorder, row.sub && styles.subRow]}>
              <View style={styles.rowTop}>
                <Text style={[row.sub ? styles.subLabel : styles.label]}>{row.label}</Text>
                <Text style={styles.value}>
                  {noData ? '—' : fmtAmount(value, row.unit)}
                  {target !== undefined && (
                    <Text style={styles.muted}>
                      {'  '}
                      {macro ? `/ ${fmt(target)} g` : `${Math.round((pct ?? 0) * 100)}% DV`}
                    </Text>
                  )}
                </Text>
              </View>
              {target !== undefined && !noData && (
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.min(pct ?? 0, 1) * 100}%`,
                        backgroundColor: row.color ?? colors.primary,
                      },
                    ]}
                  />
                </View>
              )}
              {!macro && n > 0 && reported < n && (
                <Text style={styles.coverage}>
                  {reported === 0 ? 'Not reported by any food' : `Reported by ${reported} of ${n} foods`}
                </Text>
              )}
            </View>
          );
        })}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing, gap: 12, paddingBottom: spacing * 3 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: spacing, gap: 4 },
  kcal: { fontSize: 28, fontWeight: '800', color: colors.text },
  kcalGoal: { fontSize: 16, fontWeight: '500', color: colors.muted },
  muted: { fontSize: 13, color: colors.muted, fontWeight: '400' },
  row: { paddingVertical: 10, gap: 6 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  subRow: { paddingLeft: 16 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  subLabel: { fontSize: 14, color: colors.text },
  value: { fontSize: 15, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  track: { height: 5, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  coverage: { fontSize: 11, color: colors.muted },
  footnote: { fontSize: 12, color: colors.muted, textAlign: 'center', paddingHorizontal: spacing },
});
