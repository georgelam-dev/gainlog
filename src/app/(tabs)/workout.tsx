import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionMenu } from '@/components/ActionMenu';
import { Elapsed } from '@/components/workout/Elapsed';
import { colors, radius, spacing } from '@/constants/theme';
import { useWorkout } from '@/context/WorkoutProvider';
import { makeId } from '@/lib/date';
import { countDoneSets } from '@/lib/workout';
import type { Routine } from '@/lib/workoutTypes';

export default function WorkoutScreen() {
  const { active, startWorkout, routines, deleteRoutine, setRoutineDraft, workouts } = useWorkout();
  const [menuFor, setMenuFor] = useState<Routine | null>(null);

  const start = (routine?: Routine) => {
    if (startWorkout(routine)) {
      router.push('/workout/active');
      return;
    }
    Alert.alert('Workout in progress', 'Finish or discard your current workout before starting another.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resume', onPress: () => router.push('/workout/active') },
    ]);
  };

  const newRoutine = () => {
    setRoutineDraft({ id: makeId(), name: '', exercises: [] });
    router.push('/workout/routine-editor');
  };

  const editRoutine = (r: Routine) => {
    setRoutineDraft({ ...r, exercises: r.exercises.map((e) => ({ ...e })) });
    router.push('/workout/routine-editor');
  };

  const confirmDelete = (r: Routine) =>
    Alert.alert('Delete routine?', r.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRoutine(r.id) },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {active ? (
        <Pressable
          style={({ pressed }) => [styles.activeCard, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/workout/active')}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.activeLabel}>In progress</Text>
            <Text style={styles.activeName} numberOfLines={1}>
              {active.name}
            </Text>
            <Text style={styles.activeMeta}>
              {active.exercises.length} exercise{active.exercises.length === 1 ? '' : 's'} ·{' '}
              {countDoneSets(active.exercises)} sets done
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Elapsed since={active.startedAt} style={styles.activeTime} />
            <Text style={styles.activeLabel}>Resume ›</Text>
          </View>
        </Pressable>
      ) : (
        <Pressable style={styles.primaryBtn} onPress={() => start()}>
          <Text style={styles.primaryText}>Start empty workout</Text>
        </Pressable>
      )}

      {/* Routines */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Routines</Text>
          <Pressable onPress={newRoutine} hitSlop={10}>
            <Text style={styles.link}>+ New</Text>
          </Pressable>
        </View>
        {routines.map((r) => (
          <Pressable
            key={r.id}
            style={({ pressed }) => [styles.routine, pressed && { backgroundColor: colors.cardAlt }]}
            onPress={() => setMenuFor(r)}
            onLongPress={() => setMenuFor(r)}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.routineName}>{r.name}</Text>
              <Text style={styles.muted} numberOfLines={2}>
                {r.exercises.map((e) => `${e.sets} × ${e.name}`).join(' · ') || 'No exercises'}
              </Text>
            </View>
            <Pressable style={styles.startBtn} onPress={() => start(r)} hitSlop={6}>
              <Text style={styles.startText}>Start</Text>
            </Pressable>
          </Pressable>
        ))}
      </View>

      {/* Shortcuts */}
      <View style={styles.card}>
        <NavRow
          label="History"
          detail={`${workouts.length} workout${workouts.length === 1 ? '' : 's'}`}
          onPress={() => router.push('/workout/history')}
        />
        <NavRow
          label="Exercises"
          detail="Browse, history, custom"
          onPress={() => router.push({ pathname: '/workout/exercise-picker', params: { target: 'browse' } })}
        />
      </View>

      <ActionMenu
        visible={menuFor !== null}
        title={menuFor?.name}
        onClose={() => setMenuFor(null)}
        actions={
          menuFor
            ? [
                { label: 'Start workout', onPress: () => start(menuFor) },
                { label: 'Edit routine', onPress: () => editRoutine(menuFor) },
                { label: 'Delete routine', destructive: true, onPress: () => confirmDelete(menuFor) },
              ]
            : []
        }
      />
    </ScrollView>
  );
}

function NavRow({ label, detail, onPress }: { label: string; detail: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.6 }]} onPress={onPress}>
      <Text style={styles.routineName}>{label}</Text>
      <Text style={[styles.muted, { flex: 1, textAlign: 'right' }]}>{detail}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing, gap: 12, paddingBottom: spacing * 3 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: spacing, gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  link: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryText: { color: colors.primaryText, fontWeight: '800', fontSize: 17 },
  activeCard: {
    backgroundColor: colors.primary,
    borderRadius: radius,
    padding: spacing,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeLabel: { color: colors.primaryText, opacity: 0.85, fontSize: 12, fontWeight: '700' },
  activeName: { color: colors.primaryText, fontSize: 18, fontWeight: '800' },
  activeMeta: { color: colors.primaryText, opacity: 0.85, fontSize: 13 },
  activeTime: { color: colors.primaryText, fontSize: 22, fontWeight: '800' },
  routine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: radius / 2,
  },
  routineName: { fontSize: 16, fontWeight: '700', color: colors.text },
  startBtn: {
    backgroundColor: colors.cardAlt,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  startText: { color: colors.primary, fontWeight: '700' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  chevron: { fontSize: 22, color: colors.muted },
});
