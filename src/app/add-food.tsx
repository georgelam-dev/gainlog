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

import { BarcodeScanner } from '@/components/BarcodeScanner';
import { FoodRow } from '@/components/FoodRow';
import { QuantitySheet } from '@/components/QuantitySheet';
import { SavedMealRow } from '@/components/SavedMealRow';
import { colors, radius, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { makeId, todayKey } from '@/lib/date';
import { fetchFoodByBarcode, searchFoods } from '@/lib/openFoodFacts';
import { isMealType, MEALS, type Food } from '@/lib/types';

type Tab = 'search' | 'favorites' | 'meals';

const MIN_QUERY = 3;
const DEBOUNCE_MS = 700;

export default function AddFoodScreen() {
  // target=draft: picking foods for a saved meal in the meal editor, not logging them.
  const params = useLocalSearchParams<{ meal?: string; date?: string; target?: string }>();
  const toDraft = params.target === 'draft';
  const meal = isMealType(params.meal) ? params.meal : 'snack';
  const date = params.date ?? todayKey();
  const mealLabel = MEALS.find((m) => m.key === meal)?.label ?? 'Meal';
  const destLabel = toDraft ? 'Add to meal' : `Add to ${mealLabel}`;

  const { favorites, isFavorite, toggleFavorite, addEntry, savedMeals, logSavedMeal, setMealDraft } =
    useAppData();
  const tabs: Tab[] = toDraft ? ['search', 'favorites'] : ['search', 'favorites', 'meals'];

  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const onBarcode = async (code: string) => {
    setScanning(false);
    setScanError(null);
    setScanLoading(true);
    try {
      const food = await fetchFoodByBarcode(code);
      if (food) setSelected(food);
      else setScanError(`No product found for barcode ${code}. Try searching by name.`);
    } catch {
      setScanError('Barcode lookup failed. Check your connection and try again.');
    } finally {
      setScanLoading(false);
    }
  };

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
    if (tab === 'meals') {
      return <Text style={styles.message}>No saved meals yet. Create one in the Meals tab.</Text>;
    }
    if (loading) return null;
    if (error) return <Text style={[styles.message, { color: colors.danger }]}>{error}</Text>;
    if (searched) return <Text style={styles.message}>No foods found for “{lastQueryRef.current}”.</Text>;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: destLabel }} />

      <View style={styles.segment}>
        {tabs.map((t) => (
          <Pressable
            key={t}
            style={[styles.segBtn, tab === t && styles.segBtnActive]}
            onPress={() => setTab(t)}>
            <Text style={[styles.segText, tab === t && styles.segTextActive]}>
              {t === 'search' ? 'Search' : t === 'favorites' ? 'Favourites' : 'Meals'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'search' && (
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => runSearch(query)}
            placeholder="Search food"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            autoFocus
            autoCorrect={false}
            style={styles.search}
          />
          {(loading || scanLoading) && (
            <ActivityIndicator style={styles.spinner} color={colors.primary} />
          )}
          </View>
          <Pressable
            style={styles.scanBtn}
            onPress={() => {
              setScanError(null);
              setScanning(true);
            }}
            accessibilityLabel="Scan barcode">
            <Text style={styles.scanIcon}>▥</Text>
            <Text style={styles.scanLabel}>Scan</Text>
          </Pressable>
        </View>
      )}
      {tab === 'search' && scanError && <Text style={styles.scanError}>{scanError}</Text>}

      {tab === 'meals' ? (
        <FlatList
          data={savedMeals}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <SavedMealRow
              meal={item}
              actionLabel="Add"
              onPress={async () => {
                await logSavedMeal(date, meal, item);
                router.back();
              }}
            />
          )}
          ListEmptyComponent={renderEmpty}
        />
      ) : (
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
      )}

      <BarcodeScanner visible={scanning} onScanned={onBarcode} onClose={() => setScanning(false)} />

      <QuantitySheet
        visible={selected !== null}
        food={selected}
        confirmLabel={destLabel}
        onConfirm={async (grams, unit) => {
          if (!selected) return;
          if (toDraft) {
            const item = { id: makeId(), food: selected, grams, unit };
            setMealDraft((d) => (d ? { ...d, items: [...d.items, item] } : d));
          } else {
            await addEntry(date, meal, selected, grams, unit);
          }
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
  searchRow: { flexDirection: 'row', gap: 8, marginHorizontal: spacing, marginBottom: 8 },
  searchWrap: { flex: 1, justifyContent: 'center' },
  scanBtn: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIcon: { color: colors.primary, fontSize: 18, lineHeight: 20 },
  scanLabel: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  scanError: { color: colors.danger, marginHorizontal: spacing, marginBottom: 8, fontSize: 13 },
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
