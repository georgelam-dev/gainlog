import { router } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { useWorkout } from '@/context/WorkoutProvider';
import { toUnit } from '@/lib/weightUnits';
import { countDoneSets, formatDurationShort, volumeKg, workoutDateLabel } from '@/lib/workout';
import type { Workout } from '@/lib/workoutTypes';
import { Text } from '@/components/ui/Text';

export default function HistoryScreen() {
  const { settings } = useAppData();
  const { workouts, deleteWorkout } = useWorkout();
  const unit = settings.weightUnit;

  const confirmDelete = (w: Workout) =>
    Alert.alert('Delete workout?', `${w.name} · ${workoutDateLabel(w)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteWorkout(w.id) },
    ]);

  return (
    <FlatList
      data={workouts}
      keyExtractor={(w) => w.id}
      contentContainerStyle={styles.content}
      ListEmptyComponent={<Text style={styles.empty}>Finished workouts will show up here.</Text>}
      renderItem={({ item: w }) => (
        <Pressable
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
          onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })}
          onLongPress={() => confirmDelete(w)}
          accessibilityHint="Long-press to delete">
          <View style={styles.rowBetween}>
            <Text style={styles.name} numberOfLines={1}>
              {w.name}
            </Text>
            <Text style={styles.muted}>{workoutDateLabel(w)}</Text>
          </View>
          <Text style={styles.muted}>
            {formatDurationShort((w.endedAt ?? w.startedAt) - w.startedAt)} · {countDoneSets(w.exercises)} sets ·{' '}
            {Math.round(toUnit(volumeKg(w.exercises), unit)).toLocaleString()} {unit}
          </Text>
          <Text style={styles.exList} numberOfLines={3}>
            {w.exercises.map((e) => `${e.sets.length} × ${e.name}`).join('\n')}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing, gap: 10, paddingBottom: spacing * 3 },
  empty: { color: colors.muted, textAlign: 'center', padding: spacing * 2 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  exList: { fontSize: 13, color: colors.text, marginTop: 4, lineHeight: 19 },
});
