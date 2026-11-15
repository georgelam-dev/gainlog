import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { ActionMenu, type MenuAction } from '@/components/ActionMenu';
import { ReorderableList } from '@/components/ReorderableList';
import { Elapsed } from '@/components/workout/Elapsed';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { RestTimerBar } from '@/components/workout/RestTimerBar';
import { colors, radius, spacing, fonts } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { useWorkout } from '@/context/WorkoutProvider';
import { continuesGroup, countDoneSets, formatRest, groupInfo, SET_TYPES } from '@/lib/workout';
import { REST_PRESETS, type WorkoutExercise } from '@/lib/workoutTypes';
import { Text, TextInput } from '@/components/ui/Text';

type Menu =
  | { ex: WorkoutExercise; kind: 'main' | 'rest' }
  | { ex: WorkoutExercise; kind: 'set'; setId: string; label: string };

export default function ActiveWorkoutScreen() {
  const { settings } = useAppData();
  const {
    active,
    renameActive,
    removeExercise,
    moveExercise,
    setExerciseRest,
    addSet,
    removeSet,
    updateSet,
    toggleSetDone,
    finishWorkout,
    discardWorkout,
    lastSetsFor,
    activePRs,
    setExerciseTracking,
    linkExercise,
    unlinkExercise,
    setSetType,
  } = useWorkout();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [dragging, setDragging] = useState(false);

  if (!active) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Workout' }} />
        <Text style={styles.muted}>No workout in progress.</Text>
      </View>
    );
  }

  const unfinished = active.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
  const done = countDoneSets(active.exercises);

  const finish = () => {
    if (done === 0) {
      Alert.alert('No completed sets', 'Tick off at least one set to save this workout.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Discard workout', style: 'destructive', onPress: discard },
      ]);
      return;
    }
    const save = async () => {
      const saved = await finishWorkout();
      if (saved) router.replace({ pathname: '/workout/[id]', params: { id: saved.id } });
    };
    Alert.alert(
      'Finish workout?',
      unfinished
        ? `${unfinished} unfinished set${unfinished === 1 ? '' : 's'} will be removed.`
        : 'It will be saved to your history.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Finish', onPress: save },
      ]
    );
  };

  const discard = () =>
    Alert.alert('Discard workout?', 'Nothing from this workout will be saved.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          discardWorkout();
          router.back();
        },
      },
    ]);

  const groups = groupInfo(active.exercises);

  const onToggle = (ex: WorkoutExercise, setId: string) => {
    const result = toggleSetDone(ex.id, setId);
    if (result === 'pr') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (result === 'needs-value') {
      Alert.alert(
        ex.tracking === 'time' ? 'Enter a time' : 'Enter reps',
        ex.tracking === 'time'
          ? 'Type how long the set lasted before ticking it, e.g. 1 3 0 for 1:30.'
          : 'Type how many reps you did before ticking the set.'
      );
    }
  };

  let actions: MenuAction[] = [];
  if (menu?.kind === 'main') {
    const ex = menu.ex;
    const i = active.exercises.findIndex((e) => e.id === ex.id);
    const hasNext = i >= 0 && i < active.exercises.length - 1;
    const timed = ex.tracking === 'time';
    actions = [
      { label: `Rest timer: ${formatRest(ex.restSec)}`, onPress: () => setMenu({ ex, kind: 'rest' }) },
      ...(hasNext && !continuesGroup(active.exercises, i)
        ? [{ label: `Superset with ${active.exercises[i + 1].name}`, onPress: () => linkExercise(ex.id) }]
        : []),
      ...(groups[i] ? [{ label: 'Remove from superset', onPress: () => unlinkExercise(ex.id) }] : []),
      {
        label: timed ? 'Track reps instead of time' : 'Track time instead of reps',
        onPress: () => setExerciseTracking(ex.id, timed ? 'reps' : 'time'),
      },
      {
        label: 'View history',
        onPress: () => router.push({ pathname: '/workout/exercise/[id]', params: { id: ex.exerciseId } }),
      },
      {
        label: 'Remove exercise',
        destructive: true,
        onPress: () =>
          Alert.alert(`Remove ${ex.name}?`, 'Its sets in this workout will be deleted.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => removeExercise(ex.id) },
          ]),
      },
    ];
  } else if (menu?.kind === 'rest') {
    const ex = menu.ex;
    actions = REST_PRESETS.map((sec) => ({
      label: `${sec === ex.restSec ? '✓  ' : ''}${sec ? formatRest(sec) : 'Off'}`,
      onPress: () => setExerciseRest(ex.id, sec),
    }));
  } else if (menu?.kind === 'set') {
    const { ex, setId, label } = menu;
    const current = ex.sets.find((s) => s.id === setId)?.type ?? 'normal';
    actions = [
      ...SET_TYPES.map((t) => ({
        label: `${t.key === current ? '✓  ' : ''}${t.label}`,
        onPress: () => setSetType(ex.id, setId, t.key),
      })),
      {
        label: `Delete set ${label}`,
        destructive: true,
        onPress: () => removeSet(ex.id, setId),
      },
    ];
  }

  const menuTitle = !menu
    ? undefined
    : menu.kind === 'rest'
      ? `Rest after each ${menu.ex.name} set`
      : menu.kind === 'set'
        ? `${menu.ex.name} · set ${menu.label}`
        : menu.ex.name;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerTitle: () => <Elapsed since={active.startedAt} style={styles.headerTime} />,
          headerTitleAlign: 'center',
          headerRight: () => (
            <Pressable onPress={finish} hitSlop={10} style={styles.finishBtn}>
              <Text style={styles.finishText}>Finish</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!dragging}>
          <TextInput
            defaultValue={active.name}
            onEndEditing={(e) => renameActive(e.nativeEvent.text.trim() || active.name)}
            style={styles.nameInput}
            placeholder="Workout name"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Workout name"
          />

          <ReorderableList
            items={active.exercises}
            keyOf={(ex) => ex.id}
            titleOf={(ex) => ex.name}
            onReorder={moveExercise}
            onDraggingChange={setDragging}
            dragAreaHeight={64}
            renderItem={(ex, i) => (
              <ExerciseCard
                exercise={ex}
                onMove={(delta) => {
                  const to = i + delta;
                  if (to >= 0 && to < active.exercises.length) moveExercise(i, to);
                }}
                lastSets={lastSetsFor(ex.exerciseId)}
                unit={settings.weightUnit}
                group={groups[i]}
                prs={activePRs}
                onMenu={() => setMenu({ ex, kind: 'main' })}
                onSetMenu={(setId, label) => setMenu({ ex, kind: 'set', setId, label })}
                onAddSet={() => addSet(ex.id)}
                onRemoveSet={(setId) => removeSet(ex.id, setId)}
                onUpdateSet={(setId, patch) => updateSet(ex.id, setId, patch)}
                onToggleSet={(setId) => onToggle(ex, setId)}
              />
            )}
          />

          <Pressable
            style={styles.addBtn}
            onPress={() =>
              router.push({ pathname: '/workout/exercise-picker', params: { target: 'active' } })
            }>
            <Text style={styles.addText}>+ Add exercises</Text>
          </Pressable>
          <Pressable style={styles.discardBtn} onPress={discard}>
            <Text style={styles.discardText}>Discard workout</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <RestTimerBar />

      <ActionMenu
        visible={menu !== null}
        title={menuTitle}
        actions={actions}
        // ActionMenu closes before running the action, so "Rest timer" can reopen it as the rest picker.
        onClose={() => setMenu(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing, gap: 12, paddingBottom: spacing * 3 },
  muted: { fontSize: 13, color: colors.muted },
  headerTime: { fontFamily: fonts.display, fontSize: 24, fontWeight: '800', color: colors.text },
  finishBtn: { backgroundColor: colors.done, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  finishText: { color: colors.bg, fontWeight: '800', fontSize: 15 },
  nameInput: { fontFamily: fonts.display, fontSize: 32, fontWeight: '800', color: colors.text, paddingVertical: 4 },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  discardBtn: { alignItems: 'center', paddingVertical: 10 },
  discardText: { color: colors.danger, fontWeight: '600' },
});
