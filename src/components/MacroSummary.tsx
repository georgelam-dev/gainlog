import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, radius, spacing, fonts } from '@/constants/theme';
import { fmt } from '@/lib/nutrition';
import type { Macros } from '@/lib/types';
import { Text } from '@/components/ui/Text';

type Props = {
  totals: Macros;
  targets: Macros;
  onPress?: () => void;
};

const RING_SIZE = 180;
const STROKE = 22;

/** The calorie ring drawn as a bumper plate: rim, a thick loaded band, and an inner lip. */
function CalorieRing({ value, target }: { value: number; target: number }) {
  const c = RING_SIZE / 2;
  const r = (RING_SIZE - STROKE) / 2 - 2;
  const circumference = 2 * Math.PI * r;
  const progress = target > 0 ? Math.min(value / target, 1) : 0;
  const remaining = target - value;
  const over = remaining < 0;

  return (
    <View
      style={styles.ringWrap}
      accessible
      accessibilityLabel={`${fmt(Math.abs(remaining))} calories ${over ? 'over goal' : 'left'}`}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {/* plate face */}
        <Circle cx={c} cy={c} r={r} stroke={colors.cardAlt} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={over ? colors.danger : colors.primary}
          strokeWidth={STROKE}
          strokeLinecap="butt"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${c} ${c})`}
        />
        {/* outer rim and inner lip, like the moulded edges of a rubber plate */}
        <Circle cx={c} cy={c} r={r + STROKE / 2 + 1} stroke={colors.border} strokeWidth={1.5} fill="none" />
        <Circle cx={c} cy={c} r={r - STROKE / 2 - 5} stroke={colors.border} strokeWidth={1.5} fill="none" />
      </Svg>
      <View style={styles.ringCenter}>
        <Text
          style={[styles.ringValue, over && { color: colors.danger }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >{fmt(Math.abs(remaining))}</Text>
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
      <View style={styles.statHead}>
        <View style={[styles.swatch, { backgroundColor: color }]} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
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
          <Text style={styles.sideValue} numberOfLines={1} adjustsFontSizeToFit>{fmt(totals.kcal)}</Text>
          <Text style={styles.sideLabel}>Eaten</Text>
        </View>
        <CalorieRing value={totals.kcal} target={targets.kcal} />
        <View style={styles.side}>
          <Text style={styles.sideValue} numberOfLines={1} adjustsFontSizeToFit>{fmt(targets.kcal)}</Text>
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
  card: { backgroundColor: colors.card, borderRadius: radius, padding: spacing, gap: 20 },
  chevron: { position: 'absolute', top: 10, right: 16, fontSize: 24, color: colors.muted },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { alignItems: 'center', width: 54 },
  sideValue: { fontFamily: fonts.display, fontSize: 26, fontWeight: '800', color: colors.text },
  sideLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringValue: { fontFamily: fonts.display, fontSize: 42, maxWidth: 120, fontWeight: '800', color: colors.text },
  ringLabel: { fontSize: 13, color: colors.muted, marginTop: -4 },
  statsRow: { flexDirection: 'row', gap: 14 },
  stat: { flex: 1, gap: 6 },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  statLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  track: { height: 8, borderRadius: 2, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  statValue: { fontSize: 13 },
  statStrong: { color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statMuted: { color: colors.muted },
});
