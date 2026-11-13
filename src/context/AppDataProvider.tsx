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
  type SavedMeal,
  type Settings,
} from '@/lib/types';

type AppData = {
  ready: boolean;
  settings: Settings;
  saveSettings: (s: Settings) => Promise<void>;

  favorites: Food[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (food: Food) => void;

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
};

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [favorites, setFavorites] = useState<Food[]>([]);
  const [customUnits, setCustomUnits] = useState<CustomUnits>({});
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [mealDraft, setMealDraft] = useState<SavedMeal | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [entries, setEntries] = useState<LogEntry[]>([]);

  // Refs hold the latest values so async mutations never act on stale state.
  const favoritesRef = useRef<Food[]>([]);
  const customUnitsRef = useRef<CustomUnits>({});
  const savedMealsRef = useRef<SavedMeal[]>([]);
  const selectedDateRef = useRef(selectedDate);
  const entriesRef = useRef<LogEntry[]>([]);

  useEffect(() => {
    (async () => {
      const [s, f, u, m] = await Promise.all([
        storage.loadSettings(),
        storage.loadFavorites(),
        storage.loadCustomUnits(),
        storage.loadSavedMeals(),
      ]);
      setSettings(s);
      favoritesRef.current = f;
      setFavorites(f);
      customUnitsRef.current = u;
      setCustomUnits(u);
      savedMealsRef.current = m;
      setSavedMeals(m);
      setReady(true);
    })();
  }, []);

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
  }, [selectedDate]);

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
    (date: string, meal: MealType, food: Food, grams: number, unit?: EntryUnit) =>
      mutateLog(date, (log) => [...log, { id: makeId(), meal, food, grams, unit }]),
    [mutateLog]
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
    (date: string, meal: MealType, items: Omit<MealItem, 'id'>[]) =>
      mutateLog(date, (log) => [
        ...log,
        ...items.map((i) => ({ id: makeId(), meal, food: i.food, grams: i.grams, unit: i.unit })),
      ]),
    [mutateLog]
  );

  const logSavedMeal = useCallback(
    (date: string, meal: MealType, saved: SavedMeal) => addEntries(date, meal, saved.items),
    [addEntries]
  );

  const value = useMemo<AppData>(
    () => ({
      ready,
      settings,
      saveSettings,
      favorites,
      isFavorite,
      toggleFavorite,
      customUnits,
      addCustomUnit,
      removeCustomUnit,
      savedMeals,
      saveMeal,
      deleteMeal,
      mealDraft,
      setMealDraft,
      selectedDate,
      setSelectedDate,
      entries,
      addEntry,
      updateEntry,
      removeEntry,
      addEntries,
      logSavedMeal,
    }),
    [
      ready,
      settings,
      saveSettings,
      favorites,
      isFavorite,
      toggleFavorite,
      customUnits,
      addCustomUnit,
      removeCustomUnit,
      savedMeals,
      saveMeal,
      deleteMeal,
      mealDraft,
      selectedDate,
      entries,
      addEntry,
      updateEntry,
      removeEntry,
      addEntries,
      logSavedMeal,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}
