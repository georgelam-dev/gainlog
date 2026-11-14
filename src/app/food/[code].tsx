import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { NutriScoreScale } from '@/components/NutriScoreBadge';
import { colors, radius, spacing } from '@/constants/theme';
import { fmt, fmt1 } from '@/lib/nutrition';
import { fetchFoodDetails, offProductUrl } from '@/lib/openFoodFacts';
import type { Food, FoodDetails, NutriScore } from '@/lib/types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'missing' }
  | { status: 'ok'; food: Food | null; details: FoodDetails };

const NUTRISCORE_TEXT: Record<NutriScore, string> = {
  a: 'Very good nutritional quality',
  b: 'Good nutritional quality',
  c: 'Average nutritional quality',
  d: 'Poor nutritional quality',
  e: 'Bad nutritional quality',
};

const NOVA: Record<number, { label: string; color: string }> = {
  1: { label: 'Unprocessed or minimally processed', color: '#038141' },
  2: { label: 'Processed culinary ingredient', color: '#FECB02' },
  3: { label: 'Processed food', color: '#EE8100' },
  4: { label: 'Ultra-processed food', color: '#E63E11' },
};

const LEVEL_COLOR = { low: colors.carbs, moderate: colors.fat, high: colors.danger } as const;
const LEVEL_LABEL = { fat: 'Fat', 'saturated-fat': 'Saturated fat', sugars: 'Sugars', salt: 'Salt' } as const;

export default function FoodDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchFoodDetails(code, ctrl.signal)
      .then((r) => setState(r ? { status: 'ok', ...r } : { status: 'missing' }))
      .catch((e) => {
        if (!ctrl.signal.aborted) {
          setState({ status: 'error', message: e instanceof Error ? e.message : String(e) });
        }
      });
    return () => ctrl.abort();
  }, [code, attempt]);

  if (state.status !== 'ok') {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Food details' }} />
        {state.status === 'loading' && <ActivityIndicator color={colors.primary} size="large" />}
        {state.status === 'missing' && (
          <Text style={styles.muted}>Open Food Facts has no details for this product.</Text>
        )}
        {state.status === 'error' && (
          <>
            <Text style={styles.muted}>Couldn’t load details. Check your connection.</Text>
            <Pressable
              style={styles.retry}
              onPress={() => {
                setState({ status: 'loading' });
                setAttempt((a) => a + 1);
              }}>
              <Text style={styles.link}>Try again</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const { food, details: d } = state;
  const levelKeys = Object.keys(d.levels) as (keyof FoodDetails['levels'])[];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Food details' }} />

      {/* Header */}
      <View style={styles.header}>
        {d.imageUrl ? (
          <Image source={{ uri: d.imageUrl }} style={styles.photo} resizeMode="contain" />
        ) : null}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.title}>{food?.name ?? 'Product'}</Text>
          {food?.brand && <Text style={styles.muted}>{food.brand}</Text>}
          {d.quantity && <Text style={styles.muted}>{d.quantity}</Text>}
          {d.categories.length > 0 && (
            <Text style={styles.muted} numberOfLines={2}>
              {d.categories.join(' · ')}
            </Text>
          )}
        </View>
      </View>

      {/* Scores */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nutri-Score</Text>
        {food?.nutriscore ? (
          <View style={styles.scoreRow}>
            <NutriScoreScale grade={food.nutriscore} />
            <Text style={[styles.body, { flex: 1 }]}>{NUTRISCORE_TEXT[food.nutriscore]}</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Not rated for this product.</Text>
        )}

        <View style={styles.divider} />
        <Text style={styles.cardTitle}>Processing (NOVA)</Text>
        {d.nova ? (
          <View style={styles.scoreRow}>
            <View style={[styles.novaBadge, { backgroundColor: NOVA[d.nova].color }]}>
              <Text style={styles.novaText}>{d.nova}</Text>
            </View>
            <Text style={[styles.body, { flex: 1 }]}>{NOVA[d.nova].label}</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Not rated for this product.</Text>
        )}

        {levelKeys.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.chips}>
              {levelKeys.map((k) => {
                const lvl = d.levels[k]!;
                return (
                  <View key={k} style={[styles.levelChip, { borderColor: LEVEL_COLOR[lvl] }]}>
                    <View style={[styles.dot, { backgroundColor: LEVEL_COLOR[lvl] }]} />
                    <Text style={styles.chipText}>
                      {LEVEL_LABEL[k]}: {lvl}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>

      {/* Diet & allergens */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Allergens</Text>
        {d.allergens.length ? (
          <View style={styles.chips}>
            {d.allergens.map((a) => (
              <View key={a} style={[styles.chip, styles.allergenChip]}>
                <Text style={[styles.chipText, { color: colors.danger }]}>{a}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>None listed.</Text>
        )}
        {d.traces.length > 0 && (
          <Text style={styles.body}>
            <Text style={styles.bold}>May contain: </Text>
            {d.traces.join(', ')}
          </Text>
        )}

        <View style={styles.divider} />
        <View style={styles.dietRow}>
          <Diet label="Vegan" value={d.vegan} />
          <Diet label="Vegetarian" value={d.vegetarian} />
          <Diet label="Palm oil" value={d.palmOil} invert />
        </View>
      </View>

      {/* Ingredients */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ingredients</Text>
        {d.ingredients ? (
          <Text style={styles.body}>{d.ingredients}</Text>
        ) : (
          <Text style={styles.muted}>No ingredient list provided.</Text>
        )}
        {d.ingredientsImageUrl && (
          <Pressable onPress={() => Linking.openURL(d.ingredientsImageUrl!)}>
            <Text style={styles.link}>View ingredients label photo</Text>
          </Pressable>
        )}
        {d.additives.length > 0 && (
          <Text style={styles.body}>
            <Text style={styles.bold}>Additives: </Text>
            {d.additives.join(', ')}
          </Text>
        )}
        {d.labels.length > 0 && (
          <View style={styles.chips}>
            {d.labels.map((l) => (
              <View key={l} style={styles.chip}>
                <Text style={styles.chipText}>{l}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Nutrition */}
      {food && <NutritionTable food={food} />}

      <Text style={[styles.muted, { textAlign: 'center' }]}>
        Product data is crowd-sourced and may be incomplete.
      </Text>
      <Pressable onPress={() => Linking.openURL(offProductUrl(code))} style={{ alignSelf: 'center' }}>
        <Text style={styles.link}>View on Open Food Facts</Text>
      </Pressable>
    </ScrollView>
  );
}

function Diet({ label, value, invert }: { label: string; value?: boolean; invert?: boolean }) {
  // For palm oil, "true" (contains it) is the bad case.
  const good = value === undefined ? undefined : invert ? !value : value;
  const mark = value === undefined ? '?' : value ? '✓' : '✕';
  const color = good === undefined ? colors.muted : good ? colors.carbs : colors.danger;
  return (
    <View style={styles.diet}>
      <Text style={[styles.dietMark, { color }]}>{mark}</Text>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function NutritionTable({ food }: { food: Food }) {
  const n = food.nutrients ?? {};
  const rows: { label: string; value?: string; indent?: boolean }[] = [
    { label: 'Energy', value: `${fmt(food.per100g.kcal)} kcal` },
    { label: 'Protein', value: `${fmt1(food.per100g.protein)} g` },
    { label: 'Carbohydrates', value: `${fmt1(food.per100g.carbs)} g` },
    { label: 'Sugars', value: n.sugars !== undefined ? `${fmt1(n.sugars)} g` : undefined, indent: true },
    { label: 'Fiber', value: n.fiber !== undefined ? `${fmt1(n.fiber)} g` : undefined, indent: true },
    { label: 'Fat', value: `${fmt1(food.per100g.fat)} g` },
    {
      label: 'Saturated fat',
      value: n.saturatedFat !== undefined ? `${fmt1(n.saturatedFat)} g` : undefined,
      indent: true,
    },
    { label: 'Sodium', value: n.sodium !== undefined ? `${fmt(n.sodium * 1000)} mg` : undefined },
  ];
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Nutrition per 100 g</Text>
      {rows
        .filter((r) => r.value !== undefined)
        .map((r) => (
          <View key={r.label} style={styles.tableRow}>
            <Text style={[styles.body, r.indent && styles.indent]}>{r.label}</Text>
            <Text style={[styles.body, styles.bold]}>{r.value}</Text>
          </View>
        ))}
      {food.servingG && (
        <Text style={styles.muted}>
          Serving: {food.servingLabel ?? 'serving'} = {fmt1(food.servingG)} g
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: spacing * 2 },
  content: { padding: spacing, gap: 12, paddingBottom: spacing * 3 },
  header: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  photo: { width: 96, height: 120, borderRadius: radius / 2, backgroundColor: '#FFFFFF' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  bold: { fontWeight: '700' },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  retry: { padding: 8 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: spacing, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  novaBadge: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  novaText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.cardAlt },
  allergenChip: { backgroundColor: 'rgba(255, 92, 92, 0.15)' },
  chipText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  levelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dietRow: { flexDirection: 'row', justifyContent: 'space-around' },
  diet: { alignItems: 'center', gap: 2 },
  dietMark: { fontSize: 20, fontWeight: '800' },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  indent: { paddingLeft: 14, color: colors.muted },
});
