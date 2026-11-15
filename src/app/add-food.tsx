import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { BarcodeScanner } from '@/components/BarcodeScanner';
import { FoodRow } from '@/components/FoodRow';
import { QuantitySheet } from '@/components/QuantitySheet';
import { QuickAddSheet } from '@/components/QuickAddSheet';
import { SavedMealRow } from '@/components/SavedMealRow';
import { colors, radius, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { makeId, todayKey } from '@/lib/date';
import { fetchFoodByBarcode, searchFoods } from '@/lib/openFoodFacts';
import { isMealType, MEALS, type EntryUnit, type Food, type SavedMeal } from '@/lib/types';
import { describeAmount } from '@/lib/units';
import { Text, TextInput } from '@/components/ui/Text';

type Tab = 'search' | 'favorites' | 'meals';

/** A food picked from a list, optionally with the amount to pre-fill (recent foods). */
type Picked = { food: Food; grams?: number; unit?: EntryUnit };

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

  const {
    favorites,
    isFavorite,
    toggleFavorite,
    addEntry,
    savedMeals,
    logSavedMeal,
    setMealDraft,
    recentFoods,
  } = useAppData();
  const tabs: Tab[] = toDraft ? ['search', 'favorites'] : ['search', 'favorites', 'meals'];

  const [tab, setTab] = useState<Tab>('search');

  /** Create or edit a saved meal; the editor returns here when done. */
  const openMealEditor = (draft: SavedMeal) => {
    setMealDraft(draft);
    router.push('/meal-editor');
  };
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Picked | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);

  /** Log the food (or add it to the meal being built), then close this screen. */
  const commit = async (food: Food, grams: number, unit?: EntryUnit) => {
    if (toDraft) {
      const item = { id: makeId(), food, grams, unit };
      setMealDraft((d) => (d ? { ...d, items: [...d.items, item] } : d));
    } else {
      await addEntry(date, meal, food, grams, unit);
    }
    router.back();
  };
  const [scanning, setScanning] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const onBarcode = async (code: string) => {
    setScanning(false);
    setScanError(null);
    setScanLoading(true);
    try {
      const food = await fetchFoodByBarcode(code);
      if (food) setSelected({ food });
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

  // With no search typed yet, the Search tab shows recently logged foods.
  const showRecent = tab === 'search' && query.trim().length < MIN_QUERY;
  const data: Picked[] =
    tab === 'favorites'
      ? favorites.map((food) => ({ food }))
      : showRecent
        ? recentFoods
        : results.map((food) => ({ food }));

  const renderEmpty = () => {
    if (tab === 'favorites') {
      return <Text style={styles.message}>No favourites yet. Star a search result to save it.</Text>;
    }
    if (tab === 'meals') {
      return (
        <Text style={styles.message}>
          Save foods you often eat together, like “Daily breakfast”, then add them here in one tap.
        </Text>
      );
    }
    if (showRecent) {
      return (
        <Text style={styles.message}>
          Search by name or scan a barcode. Foods you log will show up here for quick re-adding.
        </Text>
      );
    }
    if (loading) return null;
    if (error) return <Text style={[styles.message, { color: colors.danger }]}>{error}</Text>;
    if (searched) return <Text style={styles.message}>No foods found for “{lastQueryRef.current}”.</Text>;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: destLabel,
          headerRight: () => (
            <Pressable onPress={() => setQuickOpen(true)} hitSlop={10}>
              <Text style={styles.headerBtn}>Quick add</Text>
            </Pressable>
          ),
        }}
      />

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
          ListHeaderComponent={
            <Pressable
              style={styles.newMealBtn}
              onPress={() => openMealEditor({ id: makeId(), name: '', items: [] })}>
              <Text style={styles.newMealText}>+ New meal</Text>
            </Pressable>
          }
          renderItem={({ item }) => (
            <SavedMealRow
              meal={item}
              actionLabel="Add"
              onEdit={() => openMealEditor({ ...item, items: [...item.items] })}
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
        keyExtractor={(p) => p.food.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          showRecent && recentFoods.length ? <Text style={styles.listHeader}>Recent</Text> : undefined
        }
        renderItem={({ item }) => (
          <FoodRow
            food={item.food}
            favorite={isFavorite(item.food.id)}
            lastAmount={
              showRecent && item.grams !== undefined
                ? describeAmount({ grams: item.grams, unit: item.unit })
                : undefined
            }
            onPress={() => setSelected(item)}
            onToggleFavorite={() => toggleFavorite(item.food)}
          />
        )}
        ListEmptyComponent={renderEmpty}
      />
      )}

      <BarcodeScanner visible={scanning} onScanned={onBarcode} onClose={() => setScanning(false)} />

      <QuantitySheet
        visible={selected !== null}
        food={selected?.food ?? null}
        initialGrams={selected?.grams}
        initialUnit={selected?.unit}
        confirmLabel={destLabel}
        onConfirm={async (grams, unit) => {
          if (!selected) return;
          const { food } = selected;
          setSelected(null);
          await commit(food, grams, unit);
        }}
        onClose={() => setSelected(null)}
      />

      <QuickAddSheet
        visible={quickOpen}
        confirmLabel={destLabel}
        onConfirm={async (food, grams, unit) => {
          setQuickOpen(false);
          await commit(food, grams, unit);
        }}
        onClose={() => setQuickOpen(false)}
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
  newMealBtn: {
    marginHorizontal: spacing,
    marginBottom: 10,
    borderRadius: radius,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  newMealText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
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
  headerBtn: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  listHeader: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: spacing,
    marginTop: 4,
    marginBottom: 6,
  },
  message: { padding: spacing * 2, textAlign: 'center', color: colors.muted },
});
