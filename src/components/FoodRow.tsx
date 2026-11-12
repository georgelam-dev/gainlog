import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { fmt, fmt1 } from '@/lib/nutrition';
import type { Food } from '@/lib/types';

type Props = {
  food: Food;
  favorite: boolean;
  onPress?: () => void;
  onToggleFavorite: () => void;
};

export function FoodRow({ food, favorite, onPress, onToggleFavorite }: Props) {
  const { kcal, carbs, protein, fat } = food.per100g;
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={2}>
          {food.name}
        </Text>
        {food.brand && (
          <Text style={styles.brand} numberOfLines={1}>
            {food.brand}
          </Text>
        )}
        <Text style={styles.macros}>
          {fmt(kcal)} kcal · C {fmt1(carbs)} · P {fmt1(protein)} · F {fmt1(fat)} per 100 g
        </Text>
      </View>
      <Pressable
        hitSlop={12}
        onPress={onToggleFavorite}
        accessibilityLabel={favorite ? 'Remove from favourites' : 'Add to favourites'}
        style={styles.starBtn}>
        <Text style={[styles.star, { color: favorite ? colors.star : colors.muted }]}>
          {favorite ? '★' : '☆'}
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 12,
  },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  brand: { fontSize: 13, color: colors.muted },
  macros: { fontSize: 12, color: colors.muted, marginTop: 2 },
  starBtn: { padding: 4 },
  star: { fontSize: 26 },
});
