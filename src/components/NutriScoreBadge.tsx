import { StyleSheet, Text, View } from 'react-native';

import type { NutriScore } from '@/lib/types';

/** Official Nutri-Score colours, A (dark green) to E (red). */
export const NUTRISCORE_COLORS: Record<NutriScore, { bg: string; fg: string }> = {
  a: { bg: '#038141', fg: '#FFFFFF' },
  b: { bg: '#85BB2F', fg: '#FFFFFF' },
  c: { bg: '#FECB02', fg: '#1A1A1A' },
  d: { bg: '#EE8100', fg: '#FFFFFF' },
  e: { bg: '#E63E11', fg: '#FFFFFF' },
};

/** Small letter badge for lists. */
export function NutriScoreBadge({ grade }: { grade: NutriScore }) {
  const c = NUTRISCORE_COLORS[grade];
  return (
    <View
      style={[styles.badge, { backgroundColor: c.bg }]}
      accessibilityLabel={`Nutri-Score ${grade.toUpperCase()}`}>
      <Text style={[styles.text, { color: c.fg }]}>{grade.toUpperCase()}</Text>
    </View>
  );
}

/** Full A–E scale with the product's grade raised, for the detail screen. */
export function NutriScoreScale({ grade }: { grade: NutriScore }) {
  return (
    <View style={styles.scale} accessibilityLabel={`Nutri-Score ${grade.toUpperCase()}`}>
      {(Object.keys(NUTRISCORE_COLORS) as NutriScore[]).map((g) => {
        const c = NUTRISCORE_COLORS[g];
        const on = g === grade;
        return (
          <View
            key={g}
            style={[styles.cell, { backgroundColor: c.bg }, on ? styles.cellOn : styles.cellOff]}>
            <Text style={[styles.cellText, { color: c.fg }, on && styles.cellTextOn]}>
              {g.toUpperCase()}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 12, fontWeight: '900' },
  scale: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cell: { alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  cellOff: { width: 30, height: 30, opacity: 0.35 },
  cellOn: { width: 42, height: 42, borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF' },
  cellText: { fontSize: 15, fontWeight: '800' },
  cellTextOn: { fontSize: 22, fontWeight: '900' },
});
