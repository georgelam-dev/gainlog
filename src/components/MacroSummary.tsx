import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, radius, spacing } from '@/constants/theme';
import { fmt } from '@/lib/nutrition';
import type { Macros } from '@/lib/types';

type Props = {
  totals: Macros;
  targets: Macros;
  onPress?: () => void;
};

const RING_SIZE = 168;
const STROKE = 14;

function CalorieRing({ value, target }: { value: number; target: number }) {
  const r = (RING_SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = target > 0 ? Math.min(value / target, 1) : 0;
  const remaining = target - value;
  const over = remaining < 0;

  return (
    <View style={styles.ringWrap}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={r}
          stroke={colors.track}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={r}
          stroke={over ? colors.danger : colors.primary}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringValue, over && { color: colors.danger }]}>{fmt(Math.abs(remaining))}</Text>
        <Text style={styles.ringLabel}>{over ? 'kcal over' : 'kcal left'}</Text>
      </View>
    </View>
  );
}

function MacroStat({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const over = target > 0 && value > target;
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: over ? colors.danger : color }]} />
      </View>
      <Text style={styles.statValue}>
        <Text style={[styles.statStrong, over && { color: colors.danger }]}>{fmt(value)}</Text>
        <Text style={styles.statMuted}> / {fmt(target)}g</Text>
      </Text>
    </View>
  );
}

export function MacroSummary({ totals, targets, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityHint="Opens the full nutrition breakdown">
      {onPress && <Text style={styles.chevron}>›</Text>}
      <View style={styles.topRow}>
        <View style={styles.side}>
          <Text style={styles.sideValue}>{fmt(totals.kcal)}</Text>
          <Text style={styles.sideLabel}>Eaten</Text>
        </View>
        <CalorieRing value={totals.kcal} target={targets.kcal} />
        <View style={styles.side}>
          <Text style={styles.sideValue}>{fmt(targets.kcal)}</Text>
          <Text style={styles.sideLabel}>Goal</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <MacroStat label="Carbs" value={totals.carbs} target={targets.carbs} color={colors.carbs} />
        <MacroStat label="Protein" value={totals.protein} target={targets.protein} color={colors.protein} />
        <MacroStat label="Fat" value={totals.fat} target={targets.fat} color={colors.fat} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius, padding: spacing + 4, gap: 20 },
  chevron: { position: 'absolute', top: 10, right: 16, fontSize: 24, color: colors.muted },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { alignItems: 'center', width: 64 },
  sideValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  sideLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringValue: { fontSize: 34, fontWeight: '800', color: colors.text },
  ringLabel: { fontSize: 13, color: colors.muted },
  statsRow: { flexDirection: 'row', gap: 14 },
  stat: { flex: 1, gap: 6 },
  statLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  statValue: { fontSize: 12 },
  statStrong: { color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statMuted: { color: colors.muted },
});
