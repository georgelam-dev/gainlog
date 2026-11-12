import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MealBreakdown } from '@/components/MealBreakdown';
import { colors, radius, spacing } from '@/constants/theme';
import { fmt, scale, sumEntries } from '@/lib/nutrition';
import type { LogEntry } from '@/lib/types';

type Props = {
  label: string;
  icon: string;
  entries: LogEntry[];
  onAdd: () => void;
  onPressEntry: (entry: LogEntry) => void;
};

export function MealSection({ label, icon, entries, onAdd, onPressEntry }: Props) {
  // Expanded by default whenever the meal has food; the user can collapse it.
  const [collapsed, setCollapsed] = useState(false);
  const totals = sumEntries(entries);
  const hasEntries = entries.length > 0;
  const expanded = hasEntries && !collapsed;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
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
        <Pressable style={styles.addBtn} onPress={onAdd} accessibilityLabel={`Add food to ${label}`}>
          <Text style={styles.addText}>+</Text>
        </Pressable>
      </View>

      {expanded && <MealBreakdown totals={totals} />}

      {entries.map((e) => {
        const m = scale(e.food, e.grams);
        return (
          <Pressable key={e.id} style={styles.entry} onPress={() => onPressEntry(e)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.entryName} numberOfLines={1}>
                {e.food.name}
              </Text>
              <Text style={styles.entryMeta} numberOfLines={1}>
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
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
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
  entryName: { fontSize: 15, color: colors.text, fontWeight: '500' },
  entryMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  entryKcal: { fontSize: 15, color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  entryUnit: { fontSize: 12, color: colors.muted, fontWeight: '400' },
});
