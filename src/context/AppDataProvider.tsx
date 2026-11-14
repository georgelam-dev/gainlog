import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { makeId, todayKey } from '@/lib/date';
import { storage, type CustomUnits } from '@/lib/storage';
import {
  DEFAULT_SETTINGS,
  type EntryUnit,
  type Food,
  type FoodUnit,
  type LogEntry,
  type MealItem,
  type MealType,
  type RecentFood,
  type SavedMeal,
  type Settings,
  type WeightEntry,
} from '@/lib/types';

const MAX_RECENT = 30;

type AppData = {
  ready: boolean;
  settings: Settings;
  saveSettings: (s: Settings) => Promise<void>;
  /** Re-read everything from storage (after importing a backup). */
  reloadAll: () => Promise<void>;

  favorites: Food[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (food: Food) => void;

  recentFoods: RecentFood[];

  customUnits: CustomUnits;
  addCustomUnit: (foodId: string, unit: FoodUnit) => void;
  removeCustomUnit: (foodId: string, label: string) => void;

  savedMeals: SavedMeal[];
  /** Insert or replace (by id) a saved meal. */
  saveMeal: (meal: SavedMeal) => void;
  deleteMeal: (id: string) => void;
  /** Meal being built/edited in the meal editor; add-food appends to it. */
  mealDraft: SavedMeal | null;
  setMealDraft: (draft: SavedMeal | null | ((d: SavedMeal | null) => SavedMeal | null)) => void;

  weights: WeightEntry[];
  /** Set (or replace) the bodyweight for a day. */
  setWeight: (date: string, kg: number) => void;
  deleteWeight: (date: string) => void;

  selectedDate: string;
  setSelectedDate: (date: string) => void;
  entries: LogEntry[];

  addEntry: (date: string, meal: MealType, food: Food, grams: number, unit?: EntryUnit) => Promise<void>;
  updateEntry: (date: string, id: string, grams: number, unit?: EntryUnit) => Promise<void>;
  removeEntry: (date: string, id: string) => Promise<void>;
  /** Log copies of these items (from a saved meal or another day) into a meal slot. */
  addEntries: (date: string, meal: MealType, items: Omit<MealItem, 'id'>[]) => Promise<void>;
  /** Log every item of a saved meal into a meal slot. */
  logSavedMeal: (date: string, meal: MealType, saved: SavedMeal) => Promise<void>;
  /** Copy one meal slot from another day; resolves to the number of items copied. */
  copyMealFromDate: (fromDate: string, toDate: string, meal: MealType) => Promise<number>;
};

const AppDataContext = createContext<AppData | null>(null);

/** Read every app-wide value from storage (logs are loaded per day). */
const fetchAll = () =>
  Promise.all([
    storage.loadSettings(),
    storage.loadFavorites(),
    storage.loadRecentFoods(),
    storage.loadCustomUnits(),
    storage.loadSavedMeals(),
    storage.loadWeights(),
  ]);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [favorites, setFavorites] = useState<Food[]>([]);
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [customUnits, setCustomUnits] = useState<CustomUnits>({});
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [mealDraft, setMealDraft] = useState<SavedMeal | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  /** Bumped after an import so the selected day's log is re-read. */
  const [dataVersion, setDataVersion] = useState(0);

  // Refs hold the latest values so async mutations never act on stale state.
  const favoritesRef = useRef<Food[]>([]);
  const recentRef = useRef<RecentFood[]>([]);
  const customUnitsRef = useRef<CustomUnits>({});
  const savedMealsRef = useRef<SavedMeal[]>([]);
  const weightsRef = useRef<WeightEntry[]>([]);
  const selectedDateRef = useRef(selectedDate);
  const entriesRef = useRef<LogEntry[]>([]);

  const applyAll = useCallback((data: Awaited<ReturnType<typeof fetchAll>>) => {
    const [s, f, r, u, m, w] = data;
    setSettings(s);
    favoritesRef.current = f;
    setFavorites(f);
    recentRef.current = r;
    setRecentFoods(r);
    customUnitsRef.current = u;
    setCustomUnits(u);
    savedMealsRef.current = m;
    setSavedMeals(m);
    weightsRef.current = w;
    setWeights(w);
  }, []);

  useEffect(() => {
    fetchAll().then((data) => {
      applyAll(data);
      setReady(true);
    });
  }, [applyAll]);

  const reloadAll = useCallback(async () => {
    setMealDraft(null);
    applyAll(await fetchAll());
    setDataVersion((v) => v + 1);
  }, [applyAll]);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
    let cancelled = false;
    storage.loadLog(selectedDate).then((log) => {
      if (cancelled) return;
      entriesRef.current = log;
      setEntries(log);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, dataVersion]);

  const saveSettings = useCallback(async (s: Settings) => {
    setSettings(s);
    await storage.saveSettings(s);
  }, []);

  const isFavorite = useCallback((id: string) => favorites.some((f) => f.id === id), [favorites]);

  const toggleFavorite = useCallback((food: Food) => {
    const current = favoritesRef.current;
    const next = current.some((f) => f.id === food.id)
      ? current.filter((f) => f.id !== food.id)
      : [food, ...current];
    favoritesRef.current = next;
    setFavorites(next);
    storage.saveFavorites(next);
  }, []);

  /** Move just-logged foods to the front of the recent list (quick adds are skipped). */
  const pushRecent = useCallback((items: RecentFood[]) => {
    const fresh = items.filter((i) => !i.food.quick).reverse();
    if (!fresh.length) return;
    const seen = new Set<string>();
    const next = [...fresh, ...recentRef.current]
      .filter((r) => (seen.has(r.food.id) ? false : (seen.add(r.food.id), true)))
      .slice(0, MAX_RECENT);
    recentRef.current = next;
    setRecentFoods(next);
    storage.saveRecentFoods(next);
  }, []);

  const setUnitsFor = useCallback((foodId: string, fn: (units: FoodUnit[]) => FoodUnit[]) => {
    const current = customUnitsRef.current;
    const nextUnits = fn(current[foodId] ?? []);
    const next = { ...current };
    if (nextUnits.length) next[foodId] = nextUnits;
    else delete next[foodId];
    customUnitsRef.current = next;
    setCustomUnits(next);
    storage.saveCustomUnits(next);
  }, []);

  const addCustomUnit = useCallback(
    (foodId: string, unit: FoodUnit) =>
      setUnitsFor(foodId, (units) => [
        ...units.filter((u) => u.label.toLowerCase() !== unit.label.toLowerCase()),
        unit,
      ]),
    [setUnitsFor]
  );

  const removeCustomUnit = useCallback(
    (foodId: string, label: string) =>
      setUnitsFor(foodId, (units) => units.filter((u) => u.label !== label)),
    [setUnitsFor]
  );

  const setMeals = useCallback((fn: (meals: SavedMeal[]) => SavedMeal[]) => {
    const next = fn(savedMealsRef.current);
    savedMealsRef.current = next;
    setSavedMeals(next);
    storage.saveSavedMeals(next);
  }, []);

  const saveMeal = useCallback(
    (meal: SavedMeal) =>
      setMeals((meals) =>
        meals.some((m) => m.id === meal.id)
          ? meals.map((m) => (m.id === meal.id ? meal : m))
          : [...meals, meal]
      ),
    [setMeals]
  );

  const deleteMeal = useCallback(
    (id: string) => setMeals((meals) => meals.filter((m) => m.id !== id)),
    [setMeals]
  );

  const mutateWeights = useCallback((fn: (w: WeightEntry[]) => WeightEntry[]) => {
    const next = fn(weightsRef.current).sort((a, b) => a.date.localeCompare(b.date));
    weightsRef.current = next;
    setWeights(next);
    storage.saveWeights(next);
  }, []);

  const setWeight = useCallback(
    (date: string, kg: number) =>
      mutateWeights((w) => [...w.filter((e) => e.date !== date), { date, kg }]),
    [mutateWeights]
  );

  const deleteWeight = useCallback(
    (date: string) => mutateWeights((w) => w.filter((e) => e.date !== date)),
    [mutateWeights]
  );

  /** Apply a change to the log for `date`, whether or not it is the selected day. */
  const mutateLog = useCallback(async (date: string, fn: (log: LogEntry[]) => LogEntry[]) => {
    const isSelected = date === selectedDateRef.current;
    const current = isSelected ? entriesRef.current : await storage.loadLog(date);
    const next = fn(current);
    if (isSelected) {
      entriesRef.current = next;
      setEntries(next);
    }
    await storage.saveLog(date, next);
  }, []);

  const addEntry = useCallback(
    async (date: string, meal: MealType, food: Food, grams: number, unit?: EntryUnit) => {
      await mutateLog(date, (log) => [...log, { id: makeId(), meal, food, grams, unit }]);
      pushRecent([{ food, grams, unit }]);
    },
    [mutateLog, pushRecent]
  );

  const updateEntry = useCallback(
    (date: string, id: string, grams: number, unit?: EntryUnit) =>
      mutateLog(date, (log) => log.map((e) => (e.id === id ? { ...e, grams, unit } : e))),
    [mutateLog]
  );

  const removeEntry = useCallback(
    (date: string, id: string) => mutateLog(date, (log) => log.filter((e) => e.id !== id)),
    [mutateLog]
  );

  const addEntries = useCallback(
    async (date: string, meal: MealType, items: Omit<MealItem, 'id'>[]) => {
      await mutateLog(date, (log) => [
        ...log,
        ...items.map((i) => ({ id: makeId(), meal, food: i.food, grams: i.grams, unit: i.unit })),
      ]);
      pushRecent(items.map((i) => ({ food: i.food, grams: i.grams, unit: i.unit })));
    },
    [mutateLog, pushRecent]
  );

  const logSavedMeal = useCallback(
    (date: string, meal: MealType, saved: SavedMeal) => addEntries(date, meal, saved.items),
    [addEntries]
  );

  const copyMealFromDate = useCallback(
    async (fromDate: string, toDate: string, meal: MealType) => {
      const source =
        fromDate === selectedDateRef.current ? entriesRef.current : await storage.loadLog(fromDate);
      const items = source.filter((e) => e.meal === meal);
      if (items.length) await addEntries(toDate, meal, items);
      return items.length;
    },
    [addEntries]
  );

  const value = useMemo<AppData>(
    () => ({
      ready,
      settings,
      saveSettings,
      reloadAll,
      favorites,
      isFavorite,
      toggleFavorite,
      recentFoods,
      customUnits,
      addCustomUnit,
      removeCustomUnit,
      savedMeals,
      saveMeal,
      deleteMeal,
      mealDraft,
      setMealDraft,
      weights,
      setWeight,
      deleteWeight,
      selectedDate,
      setSelectedDate,
      entries,
      addEntry,
      updateEntry,
      removeEntry,
      addEntries,
      logSavedMeal,
      copyMealFromDate,
    }),
    [
      ready,
      settings,
      saveSettings,
      reloadAll,
      favorites,
      isFavorite,
      toggleFavorite,
      recentFoods,
      customUnits,
      addCustomUnit,
      removeCustomUnit,
      savedMeals,
      saveMeal,
      deleteMeal,
      mealDraft,
      weights,
      setWeight,
      deleteWeight,
      selectedDate,
      entries,
      addEntry,
      updateEntry,
      removeEntry,
      addEntries,
      logSavedMeal,
      copyMealFromDate,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}
