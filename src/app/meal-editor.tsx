import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { QuantitySheet } from '@/components/QuantitySheet';
import { colors, radius, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { fmt, scale, sumEntries } from '@/lib/nutrition';
import type { MealItem } from '@/lib/types';
import { describeAmount } from '@/lib/units';

export default function MealEditorScreen() {
  const { mealDraft: draft, setMealDraft, savedMeals, saveMeal, deleteMeal } = useAppData();
  const [editing, setEditing] = useState<MealItem | null>(null);

  if (!draft) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>Nothing to edit.</Text>
      </View>
    );
  }

  const isExisting = savedMeals.some((m) => m.id === draft.id);
  const totals = sumEntries(draft.items);
  const canSave = draft.name.trim().length > 0 && draft.items.length > 0;

  const updateItems = (fn: (items: MealItem[]) => MealItem[]) =>
    setMealDraft((d) => (d ? { ...d, items: fn(d.items) } : d));

  const save = () => {
    if (!canSave) return;
    saveMeal({ ...draft, name: draft.name.trim() });
    setMealDraft(null);
    router.back();
  };

  const confirmDeleteMeal = () =>
    Alert.alert('Delete meal?', draft.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMeal(draft.id);
          setMealDraft(null);
          router.back();
        },
      },
    ]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: isExisting ? 'Edit meal' : 'New meal' }} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={draft.name}
          onChangeText={(name) => setMealDraft((d) => (d ? { ...d, name } : d))}
          placeholder="Meal name, e.g. Daily breakfast"
          placeholderTextColor={colors.muted}
          style={styles.nameInput}
          autoFocus={!isExisting && draft.items.length === 0}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {draft.items.length} item{draft.items.length === 1 ? '' : 's'}
          </Text>
          <Text style={styles.muted}>
            {fmt(totals.kcal)} kcal · C {fmt(totals.carbs)} · P {fmt(totals.protein)} · F{' '}
            {fmt(totals.fat)}
          </Text>

          {draft.items.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}
              onPress={() => setEditing(item)}
              accessibilityHint="Tap to change amount">
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.food.name}
                </Text>
                <Text style={styles.muted} numberOfLines={1}>
                  {describeAmount(item)}
                  {item.unit ? ` · ${fmt(item.grams)} g` : ''}
                </Text>
              </View>
              <Text style={styles.itemKcal}>{fmt(scale(item.food, item.grams).kcal)} kcal</Text>
              <Pressable
                hitSlop={10}
                onPress={() => updateItems((items) => items.filter((i) => i.id !== item.id))}
                accessibilityLabel={`Remove ${item.food.name}`}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            </Pressable>
          ))}

          <Pressable
            style={styles.addBtn}
            onPress={() => router.push({ pathname: '/add-food', params: { target: 'draft' } })}>
            <Text style={styles.addText}>+ Add food</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.saveBtn, !canSave && { opacity: 0.4 }]}
          disabled={!canSave}
          onPress={save}>
          <Text style={styles.saveText}>Save meal</Text>
        </Pressable>
        {!canSave && (
          <Text style={[styles.muted, { textAlign: 'center' }]}>
            Give the meal a name and at least one food.
          </Text>
        )}
        {isExisting && (
          <Pressable style={styles.deleteBtn} onPress={confirmDeleteMeal}>
            <Text style={styles.deleteText}>Delete meal</Text>
          </Pressable>
        )}
      </ScrollView>

      <QuantitySheet
        visible={editing !== null}
        food={editing?.food ?? null}
        initialGrams={editing?.grams}
        initialUnit={editing?.unit}
        confirmLabel="Save"
        onConfirm={(grams, unit) => {
          if (editing) {
            updateItems((items) =>
              items.map((i) => (i.id === editing.id ? { ...i, grams, unit } : i))
            );
          }
          setEditing(null);
        }}
        onDelete={() => {
          if (editing) updateItems((items) => items.filter((i) => i.id !== editing.id));
          setEditing(null);
        }}
        onClose={() => setEditing(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing, gap: spacing },
  muted: { fontSize: 13, color: colors.muted },
  nameInput: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    color: colors.text,
  },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: spacing, gap: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: 6,
  },
  itemName: { fontSize: 15, color: colors.text, fontWeight: '500' },
  itemKcal: { fontSize: 14, color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  remove: { fontSize: 16, color: colors.muted, paddingHorizontal: 4 },
  addBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addText: { color: colors.primary, fontWeight: '700' },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  deleteBtn: { alignItems: 'center', paddingVertical: 10 },
  deleteText: { color: colors.danger, fontWeight: '600' },
});
