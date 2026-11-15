import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, radii, radius } from '@/constants/theme';
import type { WeightUnit } from '@/lib/types';
import { fmtLoad, parseNum, toKg, toUnit } from '@/lib/weightUnits';
import {
  formatRest,
  formatSec,
  formatSet,
  groupName,
  parseTimeInput,
  PR_LABELS,
  setLabels,
  setTypeLabel,
  suggestSet,
  type GroupInfo,
  type PRKind,
} from '@/lib/workout';
import type { SetType, Tracking, WorkoutExercise, WorkoutSet } from '@/lib/workoutTypes';
import { Text, TextInput } from '@/components/ui/Text';

type Props = {
  exercise: WorkoutExercise;
  /** Completed sets from the last time this exercise was done */
  lastSets: WorkoutSet[];
  unit: WeightUnit;
  /** Superset/circuit membership, if any */
  group?: GroupInfo;
  /** Set id → records beaten in this workout */
  prs: Map<string, PRKind[]>;
  onMenu: () => void;
  /** Tap on a set's number: change its type or delete it. */
  onSetMenu: (setId: string, label: string) => void;
  /** Screen-reader move up (-1) / down (+1); sighted users drag the header instead. */
  onMove: (delta: -1 | 1) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onUpdateSet: (setId: string, patch: Partial<Omit<WorkoutSet, 'id'>>) => void;
  onToggleSet: (setId: string) => void;
};

const TYPE_COLORS: Partial<Record<SetType, string>> = {
  warmup: colors.carbs,
  drop: colors.primary,
  failure: colors.danger,
};

export function ExerciseCard({
  exercise,
  lastSets,
  unit,
  group,
  prs,
  onMenu,
  onSetMenu,
  onMove,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onToggleSet,
}: Props) {
  const tracking: Tracking = exercise.tracking ?? 'reps';
  const labels = setLabels(exercise.sets);
  const groupColor = group ? colors.groups[group.colorIndex % colors.groups.length] : undefined;

  const confirmRemove = (set: WorkoutSet, label: string) =>
    Alert.alert(`Delete set ${label}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onRemoveSet(set.id) },
    ]);

  return (
    <View style={[styles.card, groupColor && { borderLeftWidth: 4, borderLeftColor: groupColor }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text
            style={styles.name}
            accessibilityActions={[
              { name: 'moveUp', label: 'Move up' },
              { name: 'moveDown', label: 'Move down' },
            ]}
            onAccessibilityAction={(e) => onMove(e.nativeEvent.actionName === 'moveUp' ? -1 : 1)}>
            {exercise.name}
          </Text>
          <Text style={styles.muted}>
            {group && (
              <Text style={[styles.groupTag, { color: groupColor }]}>
                {groupName(group.size)} {group.letter}
                {group.position + 1}
                {'  ·  '}
              </Text>
            )}
            {group && group.position < group.size - 1
              ? 'Rest after the round'
              : `Rest ${formatRest(exercise.restSec)}`}
          </Text>
        </View>
        <Pressable onPress={onMenu} hitSlop={12} accessibilityLabel={`${exercise.name} options`}>
          <Text style={styles.dots}>⋯</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Text style={[styles.colHead, styles.colSet]}>Set</Text>
        <Text style={[styles.colHead, styles.colPrev]}>Previous</Text>
        <Text style={[styles.colHead, styles.colInput]}>{unit}</Text>
        <Text style={[styles.colHead, styles.colInput]}>{tracking === 'time' ? 'Time' : 'Reps'}</Text>
        <View style={styles.colCheck} />
      </View>

      {exercise.sets.map((set, i) => {
        const hint = suggestSet(exercise.sets, i, lastSets);
        return (
          <SetRow
            // Remount when ticked (pre-filled values), the unit or the mode changes so inputs re-sync.
            key={`${set.id}:${set.done}:${unit}:${tracking}`}
            label={labels[i]}
            set={set}
            tracking={tracking}
            previous={formatSet(lastSets[i], tracking, unit)}
            hint={hint}
            unit={unit}
            pr={prs.get(set.id)}
            onChange={(patch) => onUpdateSet(set.id, patch)}
            onToggle={() => onToggleSet(set.id)}
            onLabelPress={() => onSetMenu(set.id, labels[i])}
            onLongPress={() => confirmRemove(set, labels[i])}
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
  label,
  set,
  tracking,
  previous,
  hint,
  unit,
  pr,
  onChange,
  onToggle,
  onLabelPress,
  onLongPress,
}: {
  label: string;
  set: WorkoutSet;
  tracking: Tracking;
  previous: string;
  hint?: Pick<WorkoutSet, 'kg' | 'reps' | 'sec'>;
  unit: WeightUnit;
  pr?: PRKind[];
  onChange: (patch: Partial<Omit<WorkoutSet, 'id'>>) => void;
  onToggle: () => void;
  onLabelPress: () => void;
  onLongPress: () => void;
}) {
  // Local text so partial input like "72." isn't reformatted while typing.
  const [kgText, setKgText] = useState(set.kg !== undefined ? fmtLoad(toUnit(set.kg, unit)) : '');
  const [repsText, setRepsText] = useState(set.reps !== undefined ? String(set.reps) : '');
  const [timeText, setTimeText] = useState(set.sec !== undefined ? formatSec(set.sec) : '');
  const typeColor = set.type ? TYPE_COLORS[set.type] : undefined;
  const typeName = setTypeLabel(set.type);

  return (
    <Pressable
      style={[styles.row, styles.setRow, set.done && styles.setDone, pr && styles.setPR]}
      onLongPress={onLongPress}
      accessibilityHint="Long-press to delete this set">
      <Pressable
        onPress={onLabelPress}
        hitSlop={6}
        style={styles.colSetBox}
        accessibilityRole="button"
        accessibilityLabel={`Set ${label}, ${typeName}. Change set type`}>
        <Text style={[styles.setNum, typeColor && { color: typeColor }]}>{label}</Text>
      </Pressable>
      <View style={[styles.colPrev, styles.prevWrap]}>
        <Text style={styles.prev} numberOfLines={1}>
          {previous}
        </Text>
        {pr && (
          <View
            style={styles.prBadge}
            accessible
            accessibilityLabel={`Personal record: ${pr.map((k) => PR_LABELS[k]).join(', ')}`}>
            <Text style={styles.prText}>PR</Text>
          </View>
        )}
      </View>
      <TextInput
        value={kgText}
        onChangeText={(t) => {
          setKgText(t);
          const v = parseNum(t);
          onChange({ kg: v === undefined ? undefined : toKg(v, unit) });
        }}
        placeholder={hint?.kg !== undefined ? fmtLoad(toUnit(hint.kg, unit)) : '–'}
        placeholderTextColor={colors.muted}
        keyboardType="decimal-pad"
        selectTextOnFocus
        style={[styles.input, styles.colInput, set.done && styles.inputDone]}
        accessibilityLabel={`Set ${label} weight in ${unit}`}
      />
      {tracking === 'time' ? (
        <TextInput
          value={timeText}
          onChangeText={(t) => {
            const parsed = parseTimeInput(t);
            setTimeText(parsed.text);
            onChange({ sec: parsed.sec });
          }}
          placeholder={hint?.sec !== undefined ? formatSec(hint.sec) : '0:00'}
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          style={[styles.input, styles.colInput, styles.timeInput, set.done && styles.inputDone]}
          accessibilityLabel={`Set ${label} time. Type digits, for example 1 3 0 for 1 minute 30`}
        />
      ) : (
        <TextInput
          value={repsText}
          onChangeText={(t) => {
            setRepsText(t);
            const v = parseNum(t);
            onChange({ reps: v === undefined ? undefined : Math.round(v) });
          }}
          placeholder={hint?.reps !== undefined ? String(hint.reps) : '–'}
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          selectTextOnFocus
          style={[styles.input, styles.colInput, set.done && styles.inputDone]}
          accessibilityLabel={`Set ${label} reps`}
        />
      )}
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        style={[styles.check, set.done && styles.checkOn, styles.colCheck]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.done }}
        accessibilityLabel={`Mark set ${label} complete`}>
        <Text style={[styles.checkText, set.done && { color: colors.primaryText }]}>✓</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { fontFamily: fonts.display, fontSize: 24, fontWeight: '800', color: colors.text },
  muted: { fontSize: 12, color: colors.muted },
  groupTag: { fontWeight: '800' },
  dots: { fontSize: 22, color: colors.muted, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setRow: { paddingVertical: 4, paddingHorizontal: 4, marginHorizontal: -4, borderRadius: radii.steel + 2 },
  setDone: { backgroundColor: colors.doneWash },
  setPR: { backgroundColor: 'rgba(242, 194, 48, 0.14)' },
  colHead: { fontSize: 12, fontWeight: '600', color: colors.muted },
  colSet: { width: 30, textAlign: 'center' },
  colSetBox: { width: 30, alignItems: 'center' },
  colPrev: { flex: 1 },
  colInput: { width: 64, textAlign: 'center' },
  colCheck: { width: 38 },
  setNum: { fontFamily: fonts.display, fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  prevWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prev: { flexShrink: 1, fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums'] },
  prBadge: { backgroundColor: colors.pr, borderRadius: radii.steel, paddingHorizontal: 4, paddingVertical: 1 },
  prText: { fontSize: 10, fontWeight: '900', color: colors.primaryText },
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: radii.steel,
    paddingVertical: 4,
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  timeInput: { fontSize: 18 },
  inputDone: { backgroundColor: 'transparent' },
  check: {
    height: 36,
    borderRadius: radii.steel,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.done },
  checkText: { fontSize: 17, fontWeight: '800', color: colors.muted },
  addSet: {
    marginTop: 4,
    paddingVertical: 9,
    borderRadius: radii.steel,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
  },
  addSetText: { color: colors.muted, fontWeight: '600', fontSize: 14 },
});
