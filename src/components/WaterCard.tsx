import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, fonts, radii, radius, spacing } from '@/constants/theme';
import { fmtWater, sumWater, WATER_PRESETS, type WaterUnit } from '@/lib/water';

type Props = {
  drinks: number[];
  goalMl: number;
  unit: WaterUnit;
  onAdd: (ml: number) => void;
  onUndo: () => void;
};

/** Daily water: a segmented gauge (one segment per glass) and quick-add buttons. */
export function WaterCard({ drinks, goalMl, unit, onAdd, onUndo }: Props) {
  const total = sumWater(drinks);
  const glass = WATER_PRESETS[unit][0];
  const segments = Math.min(16, Math.max(4, Math.round(goalMl / glass)));
  const filled = goalMl > 0 ? (total / goalMl) * segments : 0;
  const reached = goalMl > 0 && total >= goalMl;
  const left = Math.max(0, goalMl - total);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Water</Text>
        {drinks.length > 0 && (
          <Pressable
            onPress={onUndo}
            hitSlop={10}
            accessibilityLabel={`Undo last drink, ${fmtWater(drinks[drinks.length - 1], unit)}`}>
            <Text style={styles.undo}>Undo</Text>
          </Pressable>
        )}
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Water ${fmtWater(total, unit)} of ${fmtWater(goalMl, unit)}`}
        accessibilityValue={{ min: 0, max: Math.round(goalMl), now: Math.round(Math.min(total, goalMl)) }}>
        <Text style={styles.amount}>
          {fmtWater(total, unit, true)}
          <Text style={styles.goal}> / {fmtWater(goalMl, unit, true)}</Text>
        </Text>
        <View style={styles.gauge}>
          {Array.from({ length: segments }, (_, i) => {
            const fill = Math.max(0, Math.min(1, filled - i));
            return (
              <View key={i} style={styles.segment}>
                <View style={[styles.segmentFill, { width: `${fill * 100}%` }]} />
              </View>
            );
          })}
        </View>
        <Text style={[styles.note, reached && { color: colors.water }]}>
          {reached ? 'Goal reached — nice.' : `${fmtWater(left, unit)} to go`}
        </Text>
      </View>

      <View style={styles.buttons}>
        {WATER_PRESETS[unit].map((ml) => (
          <Pressable
            key={ml}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
            onPress={() => {
              Haptics.selectionAsync();
              onAdd(ml);
            }}
            accessibilityLabel={`Add ${fmtWater(ml, unit)} of water`}>
            <Text style={styles.btnText}>+ {fmtWater(ml, unit)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius, padding: spacing, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.display, fontSize: 22, fontWeight: '800', color: colors.text },
  undo: { color: colors.muted, fontWeight: '700', fontSize: 14 },
  amount: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  goal: { fontSize: 16, fontWeight: '600', color: colors.muted },
  gauge: { flexDirection: 'row', gap: 4, marginTop: 8 },
  segment: {
    flex: 1,
    height: 14,
    borderRadius: radii.steel,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  segmentFill: { height: '100%', backgroundColor: colors.water },
  note: { fontSize: 13, color: colors.muted, marginTop: 6 },
  buttons: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.steel,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
  },
  btnText: { color: colors.water, fontWeight: '800', fontSize: 15 },
});
