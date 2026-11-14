import { router, Stack } from 'expo-router';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { RestChips } from '@/components/workout/RestChips';
import { colors, radius, spacing } from '@/constants/theme';
import { useWorkout } from '@/context/WorkoutProvider';
import type { RoutineExercise } from '@/lib/workoutTypes';

const MAX_SETS = 20;

export default function RoutineEditorScreen() {
  const { routineDraft: draft, setRoutineDraft, saveRoutine, routines, rememberRest } = useWorkout();

  if (!draft) {
    return (
      <View style={styles.empty}>
        <Text style={styles.muted}>Nothing to edit.</Text>
      </View>
    );
  }

  const isNew = !routines.some((r) => r.id === draft.id);
  const valid = draft.name.trim().length > 0 && draft.exercises.length > 0;

  const patchExercise = (i: number, patch: Partial<RoutineExercise>) =>
    setRoutineDraft((d) =>
      d ? { ...d, exercises: d.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) } : d
    );

  const move = (i: number, dir: -1 | 1) =>
    setRoutineDraft((d) => {
      if (!d) return d;
      const j = i + dir;
      if (j < 0 || j >= d.exercises.length) return d;
      const list = [...d.exercises];
      [list[i], list[j]] = [list[j], list[i]];
      return { ...d, exercises: list };
    });

  const remove = (i: number) =>
    setRoutineDraft((d) => (d ? { ...d, exercises: d.exercises.filter((_, j) => j !== i) } : d));

  const save = () => {
    if (!valid) {
      Alert.alert('Almost there', 'Give the routine a name and add at least one exercise.');
      return;
    }
    saveRoutine({ ...draft, name: draft.name.trim() });
    setRoutineDraft(null);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Stack.Screen
        options={{
          title: isNew ? 'New routine' : 'Edit routine',
          headerRight: () => (
            <Pressable onPress={save} hitSlop={10}>
              <Text style={[styles.headerBtn, !valid && { opacity: 0.4 }]}>Save</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={draft.name}
          onChangeText={(name) => setRoutineDraft((d) => (d ? { ...d, name } : d))}
          placeholder="Routine name"
          placeholderTextColor={colors.muted}
          style={styles.nameInput}
          autoFocus={isNew && !draft.name}
        />

        {draft.exercises.map((e, i) => (
          <View key={`${e.exerciseId}-${i}`} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.exName} numberOfLines={2}>
                {e.name}
              </Text>
              <View style={styles.iconRow}>
                <IconBtn label="↑" onPress={() => move(i, -1)} disabled={i === 0} a11y="Move up" />
                <IconBtn
                  label="↓"
                  onPress={() => move(i, 1)}
                  disabled={i === draft.exercises.length - 1}
                  a11y="Move down"
                />
                <IconBtn label="✕" onPress={() => remove(i)} a11y={`Remove ${e.name}`} danger />
              </View>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Sets</Text>
              <View style={styles.stepper}>
                <IconBtn
                  label="−"
                  onPress={() => patchExercise(i, { sets: Math.max(1, e.sets - 1) })}
                  disabled={e.sets <= 1}
                  a11y="Fewer sets"
                />
                <Text style={styles.stepValue}>{e.sets}</Text>
                <IconBtn
                  label="+"
                  onPress={() => patchExercise(i, { sets: Math.min(MAX_SETS, e.sets + 1) })}
                  disabled={e.sets >= MAX_SETS}
                  a11y="More sets"
                />
              </View>
            </View>
            <Text style={styles.label}>Rest timer</Text>
            <RestChips
              value={e.restSec}
              onChange={(restSec) => {
                patchExercise(i, { restSec });
                rememberRest(e.exerciseId, restSec);
              }}
            />
          </View>
        ))}

        <Pressable
          style={styles.addBtn}
          onPress={() => router.push({ pathname: '/workout/exercise-picker', params: { target: 'routine' } })}>
          <Text style={styles.addText}>+ Add exercises</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function IconBtn({
  label,
  onPress,
  disabled,
  a11y,
  danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  a11y: string;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={[styles.iconBtn, disabled && { opacity: 0.3 }]}
      accessibilityLabel={a11y}>
      <Text style={[styles.iconText, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing, gap: 12, paddingBottom: spacing * 3 },
  muted: { fontSize: 13, color: colors.muted },
  headerBtn: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  nameInput: { fontSize: 24, fontWeight: '800', color: colors.text, paddingVertical: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  exName: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.primary },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  iconRow: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepValue: { fontSize: 18, fontWeight: '800', color: colors.text, minWidth: 24, textAlign: 'center' },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 14, alignItems: 'center' },
  addText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
});
