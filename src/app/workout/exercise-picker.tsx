import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomExerciseSheet } from '@/components/workout/CustomExerciseSheet';
import { colors, radius, spacing } from '@/constants/theme';
import { useWorkout } from '@/context/WorkoutProvider';
import { capitalize, MUSCLES, searchExercises } from '@/lib/exercises';
import type { Exercise } from '@/lib/workoutTypes';
import { Text, TextInput } from '@/components/ui/Text';

type Target = 'active' | 'routine' | 'browse';

export default function ExercisePickerScreen() {
  const params = useLocalSearchParams<{ target?: string }>();
  const target: Target =
    params.target === 'routine' ? 'routine' : params.target === 'browse' ? 'browse' : 'active';
  const multi = target !== 'browse';

  const { exercises, addCustomExercise, addExercises, setRoutineDraft, historyFor, restFor } =
    useWorkout();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const results = useMemo(() => searchExercises(exercises, query, muscle), [exercises, query, muscle]);
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const onPress = (e: Exercise) => {
    if (multi) toggle(e.id);
    else router.push({ pathname: '/workout/exercise/[id]', params: { id: e.id } });
  };

  const confirm = () => {
    if (!picked.length) return;
    if (target === 'active') {
      addExercises(picked);
    } else {
      setRoutineDraft((d) =>
        d
          ? {
              ...d,
              exercises: [
                ...d.exercises,
                ...picked.map((id) => ({
                  exerciseId: id,
                  name: byId.get(id)?.name ?? 'Exercise',
                  sets: 3,
                  restSec: restFor(id),
                })),
              ],
            }
          : d
      );
    }
    router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: multi ? 'Add exercises' : 'Exercises' }} />
      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${exercises.length} exercises`}
          placeholderTextColor={colors.muted}
          style={styles.search}
          autoCorrect={false}
          returnKeyType="search"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled">
          <Chip label="All" on={muscle === null} onPress={() => setMuscle(null)} />
          {MUSCLES.map((m) => (
            <Chip key={m} label={capitalize(m)} on={muscle === m} onPress={() => setMuscle(muscle === m ? null : m)} />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        contentContainerStyle={{ paddingBottom: picked.length ? 100 : spacing * 2 }}
        ListHeaderComponent={
          <Pressable style={styles.createRow} onPress={() => setCreating(true)}>
            <Text style={styles.createText}>+ Create custom exercise{query.trim() ? ` “${query.trim()}”` : ''}</Text>
          </Pressable>
        }
        ListEmptyComponent={<Text style={styles.empty}>No exercises match. Create it as a custom exercise.</Text>}
        renderItem={({ item }) => {
          const on = picked.includes(item.id);
          const sessions = historyFor(item.id).length;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.7 }]}
              onPress={() => onPress(item)}
              accessibilityState={multi ? { selected: on } : undefined}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {capitalize(item.muscle)}
                  {item.equipment ? ` · ${capitalize(item.equipment)}` : ''}
                  {item.custom ? ' · Custom' : ''}
                  {sessions ? ` · Done ${sessions}×` : ''}
                </Text>
              </View>
              {multi ? (
                <View style={[styles.check, on && styles.checkOn]}>
                  {on && <Text style={styles.checkText}>{picked.indexOf(item.id) + 1}</Text>}
                </View>
              ) : (
                <Text style={styles.chevron}>›</Text>
              )}
            </Pressable>
          );
        }}
      />

      {multi && picked.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable style={styles.addBtn} onPress={confirm}>
            <Text style={styles.addText}>
              Add {picked.length} exercise{picked.length === 1 ? '' : 's'}
            </Text>
          </Pressable>
        </View>
      )}

      <CustomExerciseSheet
        visible={creating}
        initialName={query.trim()}
        onClose={() => setCreating(false)}
        onCreate={(e) => {
          const ex = addCustomExercise(e);
          setCreating(false);
          setQuery('');
          setMuscle(null);
          if (multi) setPicked((p) => [...p, ex.id]);
        }}
      />
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing, paddingTop: 8, gap: 10, paddingBottom: 8 },
  search: {
    backgroundColor: colors.card,
    borderRadius: radius / 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  chips: { gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.track },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  chipTextOn: { color: colors.primaryText },
  createRow: { marginHorizontal: spacing, paddingVertical: 12 },
  createText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  empty: { color: colors.muted, textAlign: 'center', padding: spacing * 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: spacing,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: radius / 2,
    marginBottom: 6,
    backgroundColor: colors.card,
  },
  rowOn: { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.primary },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkText: { color: colors.primaryText, fontWeight: '800', fontSize: 12 },
  chevron: { fontSize: 22, color: colors.muted },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing,
    paddingTop: 12,
    backgroundColor: colors.bg,
  },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 14, alignItems: 'center' },
  addText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
});
