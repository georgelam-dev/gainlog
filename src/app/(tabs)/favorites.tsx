import { FlatList, StyleSheet, Text, View } from 'react-native';

import { FoodRow } from '@/components/FoodRow';
import { colors, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';

export default function FavoritesScreen() {
  const { favorites, toggleFavorite } = useAppData();

  return (
    <FlatList
      data={favorites}
      keyExtractor={(f) => f.id}
      renderItem={({ item }) => (
        <FoodRow food={item} favorite onToggleFavorite={() => toggleFavorite(item)} />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No favourites yet</Text>
          <Text style={styles.emptyText}>
            Tap the ☆ next to any search result to save it here for quick adding later.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  empty: { padding: spacing * 2, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
});
