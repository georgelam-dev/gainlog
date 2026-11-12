import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { formatDateLabel, shiftDateKey, todayKey } from '@/lib/date';

type Props = {
  date: string;
  onChange: (date: string) => void;
};

export function DateNav({ date, onChange }: Props) {
  const isToday = date === todayKey();
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel="Previous day"
        hitSlop={12}
        onPress={() => onChange(shiftDateKey(date, -1))}
        style={styles.arrow}>
        <Text style={styles.arrowText}>‹</Text>
      </Pressable>
      <Pressable onPress={() => onChange(todayKey())} disabled={isToday}>
        <Text style={styles.label}>{formatDateLabel(date)}</Text>
        {!isToday && <Text style={styles.hint}>Tap to jump to today</Text>}
      </Pressable>
      <Pressable
        accessibilityLabel="Next day"
        hitSlop={12}
        onPress={() => onChange(shiftDateKey(date, 1))}
        style={styles.arrow}>
        <Text style={styles.arrowText}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  arrow: { paddingHorizontal: 16, paddingVertical: 4 },
  arrowText: { fontSize: 32, color: colors.primary, lineHeight: 34 },
  label: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  hint: { fontSize: 11, color: colors.muted, textAlign: 'center' },
});
