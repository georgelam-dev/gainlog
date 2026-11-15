import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, spacing, fonts } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { useWorkout } from '@/context/WorkoutProvider';
import { makeId } from '@/lib/date';
import { fmtLoad, toUnit } from '@/lib/weightUnits';
import {
  countDoneSets,
  e1rm,
  formatDurationShort,
  formatSet,
  groupInfo,
  groupName,
  PR_LABELS,
  setLabels,
  volumeKg,
  workoutDateLabel,
} from '@/lib/workout';
import { Text } from '@/components/ui/Text';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useAppData();
  const { workouts, deleteWorkout, setRoutineDraft, historyPRs } = useWorkout();
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
        tracking: e.tracking,
        groupId: e.groupId,
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
  const groups = groupInfo(w.exercises);
  const prList = w.exercises.flatMap((e) =>
    e.sets.flatMap((s) => (historyPRs.get(s.id) ?? []).map((kind) => ({ ex: e, set: s, kind })))
  );

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
        {prList.length > 0 && <Stat label="PRs" value={String(prList.length)} />}
      </View>

      {prList.length > 0 && (
        <View style={[styles.card, styles.prCard]}>
          <Text style={styles.prTitle}>🏆 Personal records</Text>
          {prList.map(({ ex, set, kind }) => (
            <View key={`${set.id}:${kind}`} style={styles.rowBetween}>
              <Text style={styles.setText} numberOfLines={1}>
                {ex.name} <Text style={styles.muted}>· {PR_LABELS[kind]}</Text>
              </Text>
              <Text style={styles.prValue}>{formatSet(set, ex.tracking ?? 'reps', unit, true)}</Text>
            </View>
          ))}
        </View>
      )}

      {w.exercises.map((e, idx) => {
        const tracking = e.tracking ?? 'reps';
        const labels = setLabels(e.sets);
        const group = groups[idx];
        const groupColor = group ? colors.groups[group.colorIndex % colors.groups.length] : undefined;
        const best =
          tracking === 'time'
            ? undefined
            : e.sets.reduce<number | undefined>(
                (b, s) =>
                  s.kg !== undefined && s.type !== 'warmup' ? Math.max(b ?? 0, e1rm(s.kg, s.reps ?? 0)) : b,
                undefined
              );
        return (
          <Pressable
            key={e.id}
            style={({ pressed }) => [
              styles.card,
              groupColor && { borderLeftWidth: 4, borderLeftColor: groupColor },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => router.push({ pathname: '/workout/exercise/[id]', params: { id: e.exerciseId } })}>
            {group && (
              <Text style={[styles.groupTag, { color: groupColor }]}>
                {groupName(group.size)} {group.letter}
                {group.position + 1}
              </Text>
            )}
            <View style={styles.rowBetween}>
              <Text style={styles.exName}>{e.name}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
            {e.sets.map((s, i) => (
              <View key={s.id} style={styles.setRow}>
                <Text style={styles.setNum}>{labels[i]}</Text>
                <Text style={styles.setText}>{formatSet(s, tracking, unit, true)}</Text>
                {historyPRs.has(s.id) && <Text style={styles.prBadge}>PR</Text>}
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
  title: { fontFamily: fonts.display, fontSize: 32, fontWeight: '800', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius, padding: 12, alignItems: 'center', gap: 2 },
  statValue: { fontFamily: fonts.display, fontSize: 26, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exName: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.primary },
  chevron: { fontSize: 22, color: colors.muted },
  setRow: { flexDirection: 'row', gap: 12 },
  setNum: { width: 20, fontSize: 14, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  setText: { flexShrink: 1, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  groupTag: { fontSize: 12, fontWeight: '800' },
  prCard: { borderWidth: 1, borderColor: colors.pr },
  prTitle: { fontSize: 16, fontWeight: '800', color: colors.pr },
  prValue: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  prBadge: {
    backgroundColor: colors.pr,
    color: colors.primaryText,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 4,
    borderRadius: 4,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  deleteBtn: { alignItems: 'center', paddingVertical: 10 },
  deleteText: { color: colors.danger, fontWeight: '600' },
});
