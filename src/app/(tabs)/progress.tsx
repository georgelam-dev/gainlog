import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { TrendChart } from '@/components/TrendChart';
import { WeekCalories } from '@/components/WeekCalories';
import { colors, radius, spacing, fonts } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { formatDateLabel, shiftDateKey, todayKey } from '@/lib/date';
import type { WeightEntry } from '@/lib/types';
import { fmtW, toKg, toUnit } from '@/lib/weightUnits';
import { Text, TextInput } from '@/components/ui/Text';


type Range = 30 | 90 | 0; // 0 = all time
const RANGES: { key: Range; label: string }[] = [
  { key: 30, label: '30D' },
  { key: 90, label: '90D' },
  { key: 0, label: 'All' },
];

export default function ProgressScreen() {
  const { weights, setWeight, deleteWeight, settings } = useAppData();
  const unit = settings.weightUnit;
  const today = todayKey();

  const [date, setDate] = useState(today);
  const existing = weights.find((w) => w.date === date);
  const [text, setText] = useState('');
  const [range, setRange] = useState<Range>(30);

  const value = parseFloat(text.replace(',', '.'));
  const valid = Number.isFinite(value) && value > 0 && value < (unit === 'kg' ? 500 : 1100);

  const save = () => {
    if (!valid) return;
    setWeight(date, toKg(value, unit));
    setText('');
  };

  const changeDate = (days: number) => {
    const next = shiftDateKey(date, days);
    if (next > today) return;
    setDate(next);
    setText('');
  };

  const stats = useMemo(() => summarize(weights, today), [weights, today]);
  const inRange = useMemo(() => {
    if (range === 0) return weights;
    const from = shiftDateKey(today, -range);
    return weights.filter((w) => w.date >= from);
  }, [weights, range, today]);

  const confirmDelete = (w: WeightEntry) =>
    Alert.alert('Delete weight?', `${formatDateLabel(w.date)} · ${fmtW(toUnit(w.kg, unit))} ${unit}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteWeight(w.date) },
    ]);

  const history = [...weights].reverse();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <WeekCalories />

        <Text style={styles.section}>Bodyweight</Text>

        {/* Entry */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.dateNav}>
              <Pressable onPress={() => changeDate(-1)} hitSlop={10} accessibilityLabel="Previous day">
                <Text style={styles.navArrow}>‹</Text>
              </Pressable>
              <Text style={styles.cardTitle}>{formatDateLabel(date)}</Text>
              <Pressable
                onPress={() => changeDate(1)}
                hitSlop={10}
                disabled={date >= today}
                accessibilityLabel="Next day">
                <Text style={[styles.navArrow, date >= today && { opacity: 0.3 }]}>›</Text>
              </Pressable>
            </View>
          </View>

          {existing && (
            <Text style={styles.muted}>
              Logged: {fmtW(toUnit(existing.kg, unit))} {unit} — enter a new value to replace it.
            </Text>
          )}

          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              keyboardType="decimal-pad"
              placeholder={existing ? fmtW(toUnit(existing.kg, unit)) : unit === 'kg' ? '75.0' : '165.0'}
              placeholderTextColor={colors.muted}
              onSubmitEditing={save}
              style={styles.input}
              accessibilityLabel={`Bodyweight in ${unit}`}
            />
            <Text style={styles.unitSuffix}>{unit}</Text>
            <Pressable
              style={[styles.saveBtn, !valid && { opacity: 0.4 }]}
              disabled={!valid}
              onPress={save}>
              <Text style={styles.saveText}>{existing ? 'Update' : 'Log'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <Stat label="Latest" value={`${fmtW(toUnit(stats.latest, unit))}`} unit={unit} />
            <Stat
              label="7-day avg"
              value={stats.avg7 !== undefined ? fmtW(toUnit(stats.avg7, unit)) : '—'}
              unit={stats.avg7 !== undefined ? unit : ''}
            />
            <Stat
              label="30-day change"
              value={stats.change30 !== undefined ? signed(toUnit(stats.change30, unit)) : '—'}
              unit={stats.change30 !== undefined ? unit : ''}
            />
          </View>
        )}

        {/* Chart */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Trend</Text>
            <View style={styles.unitToggle}>
              {RANGES.map((r) => (
                <Pressable
                  key={r.key}
                  style={[styles.unitBtn, range === r.key && styles.unitBtnActive]}
                  onPress={() => setRange(r.key)}>
                  <Text style={[styles.unitText, range === r.key && styles.unitTextActive]}>
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <TrendChart
            points={inRange.map((w) => ({ date: w.date, value: toUnit(w.kg, unit) }))}
            format={(v) => `${fmtW(v)} ${unit}`}
            emptyText="Log at least two weights to see a trend."
          />
        </View>

        {/* History */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>History</Text>
          {history.length === 0 && <Text style={styles.muted}>No weights logged yet.</Text>}
          {history.map((w, i) => {
            const prev = history[i + 1];
            const delta = prev ? toUnit(w.kg - prev.kg, unit) : undefined;
            return (
              <Pressable
                key={w.date}
                style={({ pressed }) => [styles.histRow, pressed && { opacity: 0.6 }]}
                onPress={() => {
                  setDate(w.date);
                  setText('');
                }}
                onLongPress={() => confirmDelete(w)}
                accessibilityHint="Tap to edit, long-press to delete">
                <Text style={styles.histDate}>{formatDateLabel(w.date)}</Text>
                <Text style={styles.histDelta}>
                  {delta !== undefined && Math.abs(delta) >= 0.05 ? signed(delta) : ''}
                </Text>
                <Text style={styles.histValue}>
                  {fmtW(toUnit(w.kg, unit))} <Text style={styles.muted}>{unit}</Text>
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function signed(v: number) {
  const r = Math.round(v * 10) / 10;
  return `${r > 0 ? '+' : ''}${r.toFixed(1)}`;
}

function summarize(weights: WeightEntry[], today: string) {
  if (!weights.length) return null;
  const latest = weights[weights.length - 1];
  const week = weights.filter((w) => w.date > shiftDateKey(today, -7));
  const avg7 = week.length ? week.reduce((a, w) => a + w.kg, 0) / week.length : undefined;
  // Change vs the oldest entry within the last 30 days (needs two entries).
  const month = weights.filter((w) => w.date >= shiftDateKey(today, -30));
  const change30 = month.length >= 2 ? latest.kg - month[0].kg : undefined;
  return { latest: latest.kg, avg7, change30 };
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value} <Text style={styles.statUnit}>{unit}</Text>
      </Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing, gap: 12, paddingBottom: spacing * 3 },
  section: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
  },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: spacing, gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.muted, fontWeight: '400' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navArrow: { fontSize: 26, color: colors.text, lineHeight: 28, paddingHorizontal: 4 },
  unitToggle: { flexDirection: 'row', backgroundColor: colors.track, borderRadius: 999, padding: 3 },
  unitBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  unitBtnActive: { backgroundColor: colors.primary },
  unitText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  unitTextActive: { color: colors.primaryText },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius / 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 22,
    color: colors.text,
  },
  unitSuffix: { fontSize: 18, color: colors.muted },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius / 2,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  saveText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontFamily: fonts.display, fontSize: 26, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  statUnit: { fontSize: 12, fontWeight: '500', color: colors.muted },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 12,
  },
  histDate: { flex: 1, fontSize: 15, color: colors.text },
  histDelta: { fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums'] },
  histValue: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
});
