import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { useWorkout } from '@/context/WorkoutProvider';
import { makeId } from '@/lib/date';
import { fmtLoad, toUnit } from '@/lib/weightUnits';
import { countDoneSets, e1rm, formatDurationShort, volumeKg, workoutDateLabel } from '@/lib/workout';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useAppData();
  const { workouts, deleteWorkout, setRoutineDraft } = useWorkout();
  const unit = settings.weightUnit;
  const w = workouts.find((x) => x.id === id);

  if (!w) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Workout' }} />
        <Text style={styles.muted}>This workout no longer exists.</Text>
      </View>
    );
  }

  const saveAsRoutine = () => {
    setRoutineDraft({
      id: makeId(),
      name: w.name,
      exercises: w.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        name: e.name,
        sets: e.sets.length,
        restSec: e.restSec,
      })),
    });
    router.push('/workout/routine-editor');
  };

  const confirmDelete = () =>
    Alert.alert('Delete workout?', 'It will be removed from your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          router.back();
          deleteWorkout(w.id);
        },
      },
    ]);

  const time = new Date(w.startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: workoutDateLabel(w) }} />
      <Text style={styles.title}>{w.name}</Text>
      <Text style={styles.muted}>
        {workoutDateLabel(w)} at {time}
      </Text>

      <View style={styles.statsRow}>
        <Stat label="Duration" value={formatDurationShort((w.endedAt ?? w.startedAt) - w.startedAt)} />
        <Stat label="Sets" value={String(countDoneSets(w.exercises))} />
        <Stat label={`Volume (${unit})`} value={Math.round(toUnit(volumeKg(w.exercises), unit)).toLocaleString()} />
      </View>

      {w.exercises.map((e) => {
        const best = e.sets.reduce<number | undefined>(
          (b, s) => (s.kg !== undefined ? Math.max(b ?? 0, e1rm(s.kg, s.reps ?? 0)) : b),
          undefined
        );
        return (
          <Pressable
            key={e.id}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
            onPress={() => router.push({ pathname: '/workout/exercise/[id]', params: { id: e.exerciseId } })}>
            <View style={styles.rowBetween}>
              <Text style={styles.exName}>{e.name}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
            {e.sets.map((s, i) => (
              <View key={s.id} style={styles.setRow}>
                <Text style={styles.setNum}>{i + 1}</Text>
                <Text style={styles.setText}>
                  {s.kg !== undefined ? `${fmtLoad(toUnit(s.kg, unit))} ${unit} × ${s.reps}` : `${s.reps} reps`}
                </Text>
              </View>
            ))}
            {best !== undefined && (
              <Text style={styles.muted}>
                Est. 1RM {fmtLoad(toUnit(best, unit))} {unit}
              </Text>
            )}
          </Pressable>
        );
      })}

      <Pressable style={styles.primaryBtn} onPress={saveAsRoutine}>
        <Text style={styles.primaryText}>Save as routine</Text>
      </Pressable>
      <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
        <Text style={styles.deleteText}>Delete workout</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing, gap: 12, paddingBottom: spacing * 3 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius, padding: 12, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exName: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.primary },
  chevron: { fontSize: 22, color: colors.muted },
  setRow: { flexDirection: 'row', gap: 12 },
  setNum: { width: 20, fontSize: 14, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  setText: { fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  deleteBtn: { alignItems: 'center', paddingVertical: 10 },
  deleteText: { color: colors.danger, fontWeight: '600' },
});
