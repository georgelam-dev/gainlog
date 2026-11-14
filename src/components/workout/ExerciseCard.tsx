import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius } from '@/constants/theme';
import type { WeightUnit } from '@/lib/types';
import { fmtLoad, parseNum, toKg, toUnit } from '@/lib/weightUnits';
import { formatRest, suggestSet } from '@/lib/workout';
import type { WorkoutExercise, WorkoutSet } from '@/lib/workoutTypes';

type Props = {
  exercise: WorkoutExercise;
  /** Completed sets from the last time this exercise was done */
  lastSets: WorkoutSet[];
  unit: WeightUnit;
  onMenu: () => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onUpdateSet: (setId: string, patch: Partial<Omit<WorkoutSet, 'id'>>) => void;
  onToggleSet: (setId: string) => void;
};

const formatSet = (s: WorkoutSet | undefined, unit: WeightUnit) => {
  if (!s || s.reps === undefined) return '—';
  return s.kg !== undefined ? `${fmtLoad(toUnit(s.kg, unit))} × ${s.reps}` : `${s.reps} reps`;
};

export function ExerciseCard({
  exercise,
  lastSets,
  unit,
  onMenu,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onToggleSet,
}: Props) {
  const confirmRemove = (set: WorkoutSet, n: number) =>
    Alert.alert(`Delete set ${n}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onRemoveSet(set.id) },
    ]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{exercise.name}</Text>
          <Text style={styles.muted}>Rest {formatRest(exercise.restSec)}</Text>
        </View>
        <Pressable onPress={onMenu} hitSlop={12} accessibilityLabel={`${exercise.name} options`}>
          <Text style={styles.dots}>⋯</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Text style={[styles.colHead, styles.colSet]}>Set</Text>
        <Text style={[styles.colHead, styles.colPrev]}>Previous</Text>
        <Text style={[styles.colHead, styles.colInput]}>{unit}</Text>
        <Text style={[styles.colHead, styles.colInput]}>Reps</Text>
        <View style={styles.colCheck} />
      </View>

      {exercise.sets.map((set, i) => {
        const hint = suggestSet(exercise.sets, i, lastSets);
        return (
          <SetRow
            // Remount when ticked (pre-filled values) or the unit changes so inputs re-sync.
            key={`${set.id}:${set.done}:${unit}`}
            n={i + 1}
            set={set}
            previous={formatSet(lastSets[i], unit)}
            hintKg={hint?.kg}
            hintReps={hint?.reps}
            unit={unit}
            onChange={(patch) => onUpdateSet(set.id, patch)}
            onToggle={() => onToggleSet(set.id)}
            onLongPress={() => confirmRemove(set, i + 1)}
          />
        );
      })}

      <Pressable style={styles.addSet} onPress={onAddSet}>
        <Text style={styles.addSetText}>+ Add set</Text>
      </Pressable>
    </View>
  );
}

function SetRow({
  n,
  set,
  previous,
  hintKg,
  hintReps,
  unit,
  onChange,
  onToggle,
  onLongPress,
}: {
  n: number;
  set: WorkoutSet;
  previous: string;
  hintKg?: number;
  hintReps?: number;
  unit: WeightUnit;
  onChange: (patch: Partial<Omit<WorkoutSet, 'id'>>) => void;
  onToggle: () => void;
  onLongPress: () => void;
}) {
  // Local text so partial input like "72." isn't reformatted while typing.
  const [kgText, setKgText] = useState(set.kg !== undefined ? fmtLoad(toUnit(set.kg, unit)) : '');
  const [repsText, setRepsText] = useState(set.reps !== undefined ? String(set.reps) : '');

  return (
    <Pressable
      style={[styles.row, styles.setRow, set.done && styles.setDone]}
      onLongPress={onLongPress}
      accessibilityHint="Long-press to delete this set">
      <Text style={[styles.setNum, styles.colSet]}>{n}</Text>
      <Text style={[styles.prev, styles.colPrev]} numberOfLines={1}>
        {previous}
      </Text>
      <TextInput
        value={kgText}
        onChangeText={(t) => {
          setKgText(t);
          const v = parseNum(t);
          onChange({ kg: v === undefined ? undefined : toKg(v, unit) });
        }}
        placeholder={hintKg !== undefined ? fmtLoad(toUnit(hintKg, unit)) : '–'}
        placeholderTextColor={colors.muted}
        keyboardType="decimal-pad"
        selectTextOnFocus
        style={[styles.input, styles.colInput, set.done && styles.inputDone]}
        accessibilityLabel={`Set ${n} weight in ${unit}`}
      />
      <TextInput
        value={repsText}
        onChangeText={(t) => {
          setRepsText(t);
          const v = parseNum(t);
          onChange({ reps: v === undefined ? undefined : Math.round(v) });
        }}
        placeholder={hintReps !== undefined ? String(hintReps) : '–'}
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        selectTextOnFocus
        style={[styles.input, styles.colInput, set.done && styles.inputDone]}
        accessibilityLabel={`Set ${n} reps`}
      />
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        style={[styles.check, set.done && styles.checkOn, styles.colCheck]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.done }}
        accessibilityLabel={`Mark set ${n} complete`}>
        <Text style={[styles.checkText, set.done && { color: colors.primaryText }]}>✓</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { fontSize: 17, fontWeight: '700', color: colors.primary },
  muted: { fontSize: 12, color: colors.muted },
  dots: { fontSize: 22, color: colors.muted, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setRow: { paddingVertical: 4, paddingHorizontal: 4, marginHorizontal: -4, borderRadius: 10 },
  setDone: { backgroundColor: 'rgba(52, 211, 153, 0.12)' },
  colHead: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  colSet: { width: 30, textAlign: 'center' },
  colPrev: { flex: 1 },
  colInput: { width: 64, textAlign: 'center' },
  colCheck: { width: 38 },
  setNum: { fontSize: 15, fontWeight: '700', color: colors.text },
  prev: { fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums'] },
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: 8,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  inputDone: { backgroundColor: 'transparent' },
  check: {
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.carbs },
  checkText: { fontSize: 17, fontWeight: '800', color: colors.muted },
  addSet: {
    marginTop: 4,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
  },
  addSetText: { color: colors.text, fontWeight: '600', fontSize: 14 },
});
