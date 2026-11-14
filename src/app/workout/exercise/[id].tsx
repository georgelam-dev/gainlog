import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TrendChart } from '@/components/TrendChart';
import { colors, radius, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { useWorkout } from '@/context/WorkoutProvider';
import { toDateKey } from '@/lib/date';
import { capitalize } from '@/lib/exercises';
import { fmtLoad, toUnit } from '@/lib/weightUnits';
import { workoutDateLabel } from '@/lib/workout';

type Metric = 'e1rm' | 'weight';

export default function ExerciseHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useAppData();
  const { getExercise, historyFor } = useWorkout();
  const unit = settings.weightUnit;
  const [metric, setMetric] = useState<Metric>('e1rm');

  const exercise = getExercise(id);
  const sessions = historyFor(id);
  const name = exercise?.name ?? sessions[0]?.exerciseName ??'Exercise';

  const stats = useMemo(() => {
    let bestKg: number | undefined;
    let bestE1rm: number | undefined;
    let mostReps = 0;
    for (const s of sessions) {
      if (s.bestKg !== undefined) bestKg = Math.max(bestKg ?? 0, s.bestKg);
      if (s.bestE1rm !== undefined) bestE1rm = Math.max(bestE1rm ?? 0, s.bestE1rm);
      for (const set of s.sets) mostReps = Math.max(mostReps, set.reps ?? 0);
    }
    return { bestKg, bestE1rm, mostReps };
  }, [sessions]);

  const points = useMemo(
    () =>
      [...sessions]
        .reverse()
        .map((s) => ({ date: toDateKey(new Date(s.date)), kg: metric === 'e1rm' ? s.bestE1rm : s.bestKg }))
        .filter((p): p is { date: string; kg: number } => p.kg !== undefined)
        .map((p) => ({ date: p.date, value: toUnit(p.kg, unit) })),
    [sessions, metric, unit]
  );

  const weighted = stats.bestKg !== undefined;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Exercise' }} />
      <Text style={styles.title}>{name}</Text>
      {exercise && (
        <Text style={styles.muted}>
          {capitalize(exercise.muscle)}
          {exercise.equipment ? ` · ${capitalize(exercise.equipment)}` : ''}
          {exercise.custom ? ' · Custom' : ''}
        </Text>
      )}

      {sessions.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.muted}>
            No history yet. Finish a workout with this exercise to see your weights and reps here.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.statsRow}>
            {weighted ? (
              <>
                <Stat label="Best weight" value={`${fmtLoad(toUnit(stats.bestKg ?? 0, unit))}`} unit={unit} />
                <Stat label="Est. 1RM" value={`${fmtLoad(toUnit(stats.bestE1rm ?? 0, unit))}`} unit={unit} />
              </>
            ) : (
              <Stat label="Most reps" value={String(stats.mostReps)} unit="" />
            )}
            <Stat label="Sessions" value={String(sessions.length)} unit="" />
          </View>

          {weighted && (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Progress</Text>
                <View style={styles.toggle}>
                  {(
                    [
                      ['e1rm', 'Est. 1RM'],
                      ['weight', 'Top set'],
                    ] as const
                  ).map(([k, label]) => (
                    <Pressable
                      key={k}
                      style={[styles.toggleBtn, metric === k && styles.toggleOn]}
                      onPress={() => setMetric(k)}>
                      <Text style={[styles.toggleText, metric === k && styles.toggleTextOn]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <TrendChart
                points={points}
                format={(v) => `${fmtLoad(v)} ${unit}`}
                emptyText="Do this exercise in two workouts to see a trend."
                minSpan={unit === 'kg' ? 5 : 10}
              />
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>History</Text>
            {sessions.map((s) => (
              <Pressable
                key={s.workoutId}
                style={({ pressed }) => [styles.session, pressed && { opacity: 0.6 }]}
                onPress={() => router.push({ pathname: '/workout/[id]', params: { id: s.workoutId } })}>
                <View style={styles.rowBetween}>
                  <Text style={styles.sessionDate}>{workoutDateLabel({ startedAt: s.date })}</Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {s.workoutName}
                  </Text>
                </View>
                <Text style={styles.sets}>
                  {s.sets
                    .map((set) =>
                      set.kg !== undefined ? `${fmtLoad(toUnit(set.kg, unit))} × ${set.reps}` : `${set.reps} reps`
                    )
                    .join('   ·   ')}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
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
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: spacing, gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius, padding: 12, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  statUnit: { fontSize: 12, fontWeight: '500', color: colors.muted },
  toggle: { flexDirection: 'row', backgroundColor: colors.track, borderRadius: 999, padding: 3 },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  toggleOn: { backgroundColor: colors.primary },
  toggleText: { color: colors.muted, fontWeight: '600', fontSize: 12 },
  toggleTextOn: { color: colors.primaryText },
  session: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 4,
  },
  sessionDate: { fontSize: 15, fontWeight: '700', color: colors.text },
  sets: { fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'], lineHeight: 20 },
});
