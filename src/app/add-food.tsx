import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FoodRow } from '@/components/FoodRow';
import { QuantitySheet } from '@/components/QuantitySheet';
import { colors, radius, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { todayKey } from '@/lib/date';
import { searchFoods } from '@/lib/openFoodFacts';
import { isMealType, MEALS, type Food } from '@/lib/types';

type Tab = 'search' | 'favorites';

const MIN_QUERY = 3;
const DEBOUNCE_MS = 700;

export default function AddFoodScreen() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const meal = isMealType(params.meal) ? params.meal : 'snack';
  const date = params.date ?? todayKey();
  const mealLabel = MEALS.find((m) => m.key === meal)?.label ?? 'Meal';

  const { favorites, isFavorite, toggleFavorite, addEntry } = useAppData();

  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef('');

  const runSearch = async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < MIN_QUERY || trimmed === lastQueryRef.current) return;
    lastQueryRef.current = trimmed;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const foods = await searchFoods(trimmed, controller.signal);
      if (!controller.signal.aborted) {
        setResults(foods);
        setSearched(true);
      }
    } catch {
      if (!controller.signal.aborted) {
        setError('Search failed. Check your connection and try again.');
        lastQueryRef.current = '';
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  // Debounced search — Open Food Facts rate-limits search, so never per keystroke.
  useEffect(() => {
    if (tab !== 'search') return;
    const t = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, tab]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const data = tab === 'search' ? results : favorites;

  const renderEmpty = () => {
    if (tab === 'favorites') {
      return <Text style={styles.message}>No favourites yet. Star a search result to save it.</Text>;
    }
    if (loading) return null;
    if (error) return <Text style={[styles.message, { color: colors.danger }]}>{error}</Text>;
    if (searched) return <Text style={styles.message}>No foods found for “{lastQueryRef.current}”.</Text>;
    return <Text style={styles.message}>Search the Open Food Facts database (min {MIN_QUERY} letters).</Text>;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Add to ${mealLabel}` }} />

      <View style={styles.segment}>
        {(['search', 'favorites'] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.segBtn, tab === t && styles.segBtnActive]}
            onPress={() => setTab(t)}>
            <Text style={[styles.segText, tab === t && styles.segTextActive]}>
              {t === 'search' ? 'Search' : `Favourites (${favorites.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'search' && (
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => runSearch(query)}
            placeholder="Search foods, e.g. oats, greek yogurt"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            autoFocus
            autoCorrect={false}
            style={styles.search}
          />
          {loading && <ActivityIndicator style={styles.spinner} color={colors.primary} />}
        </View>
      )}

      <FlatList
        data={data}
        keyExtractor={(f) => f.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <FoodRow
            food={item}
            favorite={isFavorite(item.id)}
            onPress={() => setSelected(item)}
            onToggleFavorite={() => toggleFavorite(item)}
          />
        )}
        ListEmptyComponent={renderEmpty}
      />

      <QuantitySheet
        visible={selected !== null}
        food={selected}
        confirmLabel={`Add to ${mealLabel}`}
        onConfirm={async (grams) => {
          if (!selected) return;
          await addEntry(date, meal, selected, grams);
          setSelected(null);
          router.back();
        }}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  segment: {
    flexDirection: 'row',
    margin: spacing,
    marginBottom: 8,
    backgroundColor: colors.track,
    borderRadius: radius,
    padding: 3,
  },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius - 3 },
  segBtnActive: { backgroundColor: colors.primary },
  segText: { color: colors.muted, fontWeight: '600' },
  segTextActive: { color: colors.primaryText },
  searchRow: { marginHorizontal: spacing, marginBottom: 8, justifyContent: 'center' },
  search: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingRight: 44,
    fontSize: 16,
    color: colors.text,
  },
  spinner: { position: 'absolute', right: 14 },
  message: { padding: spacing * 2, textAlign: 'center', color: colors.muted },
});
