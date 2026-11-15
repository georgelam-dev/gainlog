import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii, radius, spacing } from '@/constants/theme';
import { useWorkout } from '@/context/WorkoutProvider';
import { formatDuration } from '@/lib/workout';
import { Text } from '@/components/ui/Text';

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
            { width: `${progress * 100}%`, backgroundColor: urgent ? colors.danger : colors.primary },
          ]}
        />
      </View>
      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={() => adjustRest(-15)} accessibilityLabel="Rest 15 seconds less">
          <Text style={styles.btnText}>−15</Text>
        </Pressable>
        <View style={styles.center}>
          <Text style={styles.label}>Rest</Text>
          <Text style={[styles.time, urgent && { color: colors.danger }]}>
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
  track: { height: 4, borderRadius: 1, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  center: { flex: 1, alignItems: 'center' },
  label: { fontSize: 13, color: colors.muted, fontWeight: '600', marginBottom: -6 },
  time: { fontFamily: fonts.display, fontSize: 44, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.steel,
    backgroundColor: colors.cardAlt,
  },
  skip: { backgroundColor: colors.primary },
  btnText: { color: colors.text, fontWeight: '700', fontSize: 16, fontVariant: ['tabular-nums'] },
});
