import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { SavedMealRow } from '@/components/SavedMealRow';
import { colors, radius, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { makeId } from '@/lib/date';

export default function MealsScreen() {
  const { savedMeals, setMealDraft } = useAppData();

  const openEditor = (draft: Parameters<typeof setMealDraft>[0]) => {
    setMealDraft(draft);
    router.push('/meal-editor');
  };

  return (
    <FlatList
      data={savedMeals}
      keyExtractor={(m) => m.id}
      ListHeaderComponent={
        <Pressable
          style={styles.newBtn}
          onPress={() => openEditor({ id: makeId(), name: '', items: [] })}>
          <Text style={styles.newText}>+ New meal</Text>
        </Pressable>
      }
      renderItem={({ item }) => (
        <SavedMealRow
          meal={item}
          onPress={() => openEditor({ ...item, items: [...item.items] })}
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No saved meals yet</Text>
          <Text style={styles.emptyText}>
            Save foods you often eat together, like “Daily breakfast”, then add them in one tap from
            any meal.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  newBtn: {
    margin: spacing,
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  newText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  empty: { padding: spacing * 2, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
});
