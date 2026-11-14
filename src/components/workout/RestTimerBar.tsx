import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';
import { useWorkout } from '@/context/WorkoutProvider';
import { formatDuration } from '@/lib/workout';

/** Countdown pinned to the bottom of the active workout while a rest is running. */
export function RestTimerBar() {
  const { rest, adjustRest, skipRest } = useWorkout();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [rest]);

  if (!rest) return null;
  const msLeft = Math.max(0, rest.endsAt - now);
  const progress = Math.min(1, msLeft / (rest.totalSec * 1000));
  const urgent = msLeft <= 3000;

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${progress * 100}%`, backgroundColor: urgent ? colors.fat : colors.primary },
          ]}
        />
      </View>
      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={() => adjustRest(-15)} accessibilityLabel="Rest 15 seconds less">
          <Text style={styles.btnText}>−15</Text>
        </Pressable>
        <View style={styles.center}>
          <Text style={styles.label}>Rest</Text>
          <Text style={[styles.time, urgent && { color: colors.fat }]}>
            {formatDuration(Math.ceil(msLeft / 1000) * 1000)}
          </Text>
        </View>
        <Pressable style={styles.btn} onPress={() => adjustRest(15)} accessibilityLabel="Rest 15 seconds more">
          <Text style={styles.btnText}>+15</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.skip]} onPress={skipRest}>
          <Text style={[styles.btnText, { color: colors.primaryText }]}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
    paddingHorizontal: spacing,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  center: { flex: 1, alignItems: 'center' },
  label: { fontSize: 11, color: colors.muted, fontWeight: '700', textTransform: 'uppercase' },
  time: { fontSize: 28, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius / 2,
    backgroundColor: colors.cardAlt,
  },
  skip: { backgroundColor: colors.primary },
  btnText: { color: colors.text, fontWeight: '700', fontSize: 15 },
});
