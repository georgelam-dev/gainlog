import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { colors } from '@/constants/theme';
import { formatRest } from '@/lib/workout';
import { REST_PRESETS } from '@/lib/workoutTypes';
import { Text } from '@/components/ui/Text';

/** Horizontal row of preset rest times (Off, 30s … 5m). */
export function RestChips({ value, onChange }: { value: number; onChange: (sec: number) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {REST_PRESETS.map((sec) => {
        const on = sec === value;
        return (
          <Pressable
            key={sec}
            onPress={() => onChange(sec)}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityLabel={sec ? `Rest ${formatRest(sec)}` : 'No rest timer'}
            accessibilityState={{ selected: on }}>
            <Text style={[styles.text, on && styles.textOn]}>{formatRest(sec)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.track,
  },
  chipOn: { backgroundColor: colors.primary },
  text: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  textOn: { color: colors.primaryText },
});
