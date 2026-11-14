import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ActionMenu, type MenuAction } from '@/components/ActionMenu';
import { Elapsed } from '@/components/workout/Elapsed';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { RestTimerBar } from '@/components/workout/RestTimerBar';
import { colors, radius, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { useWorkout } from '@/context/WorkoutProvider';
import { countDoneSets, formatRest } from '@/lib/workout';
import { REST_PRESETS, type WorkoutExercise } from '@/lib/workoutTypes';

export default function ActiveWorkoutScreen() {
  const { settings } = useAppData();
  const {
    active,
    renameActive,
    removeExercise,
    setExerciseRest,
    addSet,
    removeSet,
    updateSet,
    toggleSetDone,
    finishWorkout,
    discardWorkout,
    lastSetsFor,
  } = useWorkout();
  const [menu, setMenu] = useState<{ ex: WorkoutExercise; kind: 'main' | 'rest' } | null>(null);

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

  const onToggle = (exId: string, setId: string) => {
    if (toggleSetDone(exId, setId) === 'needs-reps') {
      Alert.alert('Enter reps', 'Type how many reps you did before ticking the set.');
    }
  };

  let actions: MenuAction[] = [];
  if (menu?.kind === 'main') {
    const ex = menu.ex;
    actions = [
      { label: `Rest timer: ${formatRest(ex.restSec)}`, onPress: () => setMenu({ ex, kind: 'rest' }) },
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
  }

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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            defaultValue={active.name}
            onEndEditing={(e) => renameActive(e.nativeEvent.text.trim() || active.name)}
            style={styles.nameInput}
            placeholder="Workout name"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Workout name"
          />
          <Text style={styles.muted}>
            {done} set{done === 1 ? '' : 's'} done · Tick a set to start its rest timer
          </Text>

          {active.exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              lastSets={lastSetsFor(ex.exerciseId)}
              unit={settings.weightUnit}
              onMenu={() => setMenu({ ex, kind: 'main' })}
              onAddSet={() => addSet(ex.id)}
              onRemoveSet={(setId) => removeSet(ex.id, setId)}
              onUpdateSet={(setId, patch) => updateSet(ex.id, setId, patch)}
              onToggleSet={(setId) => onToggle(ex.id, setId)}
            />
          ))}

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
        title={menu ? (menu.kind === 'rest' ? `Rest after each ${menu.ex.name} set` : menu.ex.name) : undefined}
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
  headerTime: { fontSize: 18, fontWeight: '800', color: colors.text },
  finishBtn: { backgroundColor: colors.carbs, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  finishText: { color: '#0E0F13', fontWeight: '800', fontSize: 15 },
  nameInput: { fontSize: 24, fontWeight: '800', color: colors.text, paddingVertical: 4 },
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
