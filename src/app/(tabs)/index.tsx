import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateNav } from '@/components/DateNav';
import { MacroSummary } from '@/components/MacroSummary';
import { MealSection } from '@/components/MealSection';
import { QuantitySheet } from '@/components/QuantitySheet';
import { spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { makeId, todayKey } from '@/lib/date';
import { macroTargets, sumEntries } from '@/lib/nutrition';
import { MEALS, type LogEntry, type MealType } from '@/lib/types';

export default function HomeScreen() {
  const {
    entries,
    settings,
    selectedDate,
    setSelectedDate,
    updateEntry,
    removeEntry,
    setMealDraft,
    addEntries,
  } = useAppData();
  const isToday = selectedDate === todayKey();
  const [editing, setEditing] = useState<LogEntry | null>(null);
  const insets = useSafeAreaInsets();

  const totals = useMemo(() => sumEntries(entries), [entries]);
  const targets = useMemo(() => macroTargets(settings), [settings]);

  const saveAsMeal = (items: LogEntry[]) => {
    setMealDraft({
      id: makeId(),
      name: '',
      items: items.map((e) => ({ id: makeId(), food: e.food, grams: e.grams, unit: e.unit })),
    });
    router.push('/meal-editor');
  };

  const copyToToday = async (meal: MealType, label: string, items: LogEntry[]) => {
    const today = todayKey();
    await addEntries(today, meal, items);
    const n = items.length;
    Alert.alert('Copied', `${n} item${n === 1 ? '' : 's'} added to today's ${label}.`, [
      { text: 'OK', style: 'cancel' },
      { text: 'View today', onPress: () => setSelectedDate(today) },
    ]);
  };

  const confirmDelete = (entry: LogEntry) =>
    Alert.alert('Delete entry?', entry.food.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeEntry(selectedDate, entry.id) },
    ]);

  return (
    <>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 4 }]}>
        <DateNav date={selectedDate} onChange={setSelectedDate} />
        <MacroSummary
          totals={totals}
          targets={targets}
          onPress={() => router.push('/nutrition')}
        />
        {MEALS.map((meal) => {
          const mealEntries = entries.filter((e) => e.meal === meal.key);
          return (
          <MealSection
            key={meal.key}
            label={meal.label}
            entries={mealEntries}
            onAdd={() =>
              router.push({ pathname: '/add-food', params: { meal: meal.key, date: selectedDate } })
            }
            onPressEntry={setEditing}
            onLongPressEntry={confirmDelete}
            menuActions={[
              ...(isToday
                ? []
                : [
                    {
                      label: 'Copy to today',
                      onPress: () => copyToToday(meal.key, meal.label, mealEntries),
                    },
                  ]),
              { label: 'Save as meal', onPress: () => saveAsMeal(mealEntries) },
            ]}
          />
          );
        })}
      </ScrollView>

      <QuantitySheet
        visible={editing !== null}
        food={editing?.food ?? null}
        initialGrams={editing?.grams}
        initialUnit={editing?.unit}
        confirmLabel="Save"
        onConfirm={(grams, unit) => {
          if (editing) updateEntry(selectedDate, editing.id, grams, unit);
          setEditing(null);
        }}
        onDelete={() => {
          if (editing) removeEntry(selectedDate, editing.id);
          setEditing(null);
        }}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing, gap: 12, paddingBottom: spacing * 3 },
});
