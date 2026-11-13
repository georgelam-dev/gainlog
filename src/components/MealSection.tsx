import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { MealBreakdown } from '@/components/MealBreakdown';
import { colors, radius, spacing } from '@/constants/theme';
import { fmt, fmt1, scale, sumEntries } from '@/lib/nutrition';
import type { LogEntry } from '@/lib/types';

type Props = {
  label: string;
  entries: LogEntry[];
  onAdd: () => void;
  onPressEntry: (entry: LogEntry) => void;
  onLongPressEntry?: (entry: LogEntry) => void;
  /** Actions shown in the ⋯ menu (only when the section has food). */
  menuActions?: { label: string; onPress: () => void }[];
};

export function MealSection({
  label,
  entries,
  onAdd,
  onPressEntry,
  onLongPressEntry,
  menuActions = [],
}: Props) {
  // Expanded by default whenever the meal has food; the user can collapse it.
  const [collapsed, setCollapsed] = useState(false);
  const totals = sumEntries(entries);
  const hasEntries = entries.length > 0;
  const expanded = hasEntries && !collapsed;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerText}
          onPress={() => setCollapsed((v) => !v)}
          disabled={!hasEntries}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${label} breakdown`}>
          <Text style={styles.title}>
            {label}
            {hasEntries && <Text style={styles.chevron}>{expanded ? '  ▾' : '  ▸'}</Text>}
          </Text>
          <Text style={styles.subtitle}>
            {hasEntries
              ? expanded
                ? `${fmt(totals.kcal)} kcal`
                : `${fmt(totals.kcal)} kcal · C ${fmt(totals.carbs)} · P ${fmt(totals.protein)} · F ${fmt(totals.fat)}`
              : 'No food logged'}
          </Text>
        </Pressable>
        {hasEntries && menuActions.length > 0 && (
          <Pressable
            style={styles.moreBtn}
            hitSlop={6}
            onPress={() =>
              Alert.alert(label, undefined, [
                ...menuActions.map((a) => ({ text: a.label, onPress: a.onPress })),
                { text: 'Cancel', style: 'cancel' as const },
              ])
            }
            accessibilityLabel={`${label} options`}>
            <Text style={styles.moreText}>⋯</Text>
          </Pressable>
        )}
        <Pressable style={styles.addBtn} onPress={onAdd} accessibilityLabel={`Add food to ${label}`}>
          <Text style={styles.addText}>+</Text>
        </Pressable>
      </View>

      {expanded && <MealBreakdown totals={totals} />}

      {entries.map((e) => {
        const m = scale(e.food, e.grams);
        return (
          <Pressable
            key={e.id}
            style={({ pressed }) => [styles.entry, pressed && { opacity: 0.6 }]}
            onPress={() => onPressEntry(e)}
            onLongPress={onLongPressEntry ? () => onLongPressEntry(e) : undefined}
            accessibilityHint="Tap to edit, long-press to delete">
            <View style={{ flex: 1 }}>
              <Text style={styles.entryName} numberOfLines={1}>
                {e.food.name}
              </Text>
              <Text style={styles.entryMeta} numberOfLines={1}>
                {e.unit ? `${fmt1(e.unit.qty)} × ${e.unit.label} · ` : ''}
                {fmt(e.grams)} g{e.food.brand ? ` · ${e.food.brand}` : ''}
              </Text>
            </View>
            <Text style={styles.entryKcal}>
              {fmt(m.kcal)} <Text style={styles.entryUnit}>kcal</Text>
            </Text>
          </Pressable>
        );
      })}

    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius, padding: spacing },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  chevron: { fontSize: 13, color: colors.muted, fontWeight: '400' },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: colors.primaryText, fontWeight: '800', fontSize: 24, lineHeight: 26 },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: 10,
    gap: 12,
  },
  moreBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: { color: colors.text, fontWeight: '800', fontSize: 20, lineHeight: 22 },
  entryName: { fontSize: 15, color: colors.text, fontWeight: '500' },
  entryMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  entryKcal: { fontSize: 15, color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  entryUnit: { fontSize: 12, color: colors.muted, fontWeight: '400' },
});
