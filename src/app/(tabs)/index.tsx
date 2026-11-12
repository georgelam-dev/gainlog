import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateNav } from '@/components/DateNav';
import { MacroSummary } from '@/components/MacroSummary';
import { MealSection } from '@/components/MealSection';
import { QuantitySheet } from '@/components/QuantitySheet';
import { spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { macroTargets, sumEntries } from '@/lib/nutrition';
import { MEALS, type LogEntry } from '@/lib/types';

export default function HomeScreen() {
  const { entries, settings, selectedDate, setSelectedDate, updateEntry, removeEntry } = useAppData();
  const [editing, setEditing] = useState<LogEntry | null>(null);
  const insets = useSafeAreaInsets();

  const totals = useMemo(() => sumEntries(entries), [entries]);
  const targets = useMemo(() => macroTargets(settings), [settings]);

  return (
    <>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 4 }]}>
        <DateNav date={selectedDate} onChange={setSelectedDate} />
        <MacroSummary totals={totals} targets={targets} />
        {MEALS.map((meal) => (
          <MealSection
            key={meal.key}
            label={meal.label}
            icon={meal.icon}
            entries={entries.filter((e) => e.meal === meal.key)}
            onAdd={() =>
              router.push({ pathname: '/add-food', params: { meal: meal.key, date: selectedDate } })
            }
            onPressEntry={setEditing}
          />
        ))}
      </ScrollView>

      <QuantitySheet
        visible={editing !== null}
        food={editing?.food ?? null}
        initialGrams={editing?.grams}
        confirmLabel="Save"
        onConfirm={(grams) => {
          if (editing) updateEntry(selectedDate, editing.id, grams);
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
