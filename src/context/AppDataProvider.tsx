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
import { storage } from '@/lib/storage';
import { DEFAULT_SETTINGS, type Food, type LogEntry, type MealType, type Settings } from '@/lib/types';

type AppData = {
  ready: boolean;
  settings: Settings;
  saveSettings: (s: Settings) => Promise<void>;

  favorites: Food[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (food: Food) => void;

  selectedDate: string;
  setSelectedDate: (date: string) => void;
  entries: LogEntry[];

  addEntry: (date: string, meal: MealType, food: Food, grams: number) => Promise<void>;
  updateEntry: (date: string, id: string, grams: number) => Promise<void>;
  removeEntry: (date: string, id: string) => Promise<void>;
};

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [favorites, setFavorites] = useState<Food[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [entries, setEntries] = useState<LogEntry[]>([]);

  // Refs hold the latest values so async mutations never act on stale state.
  const favoritesRef = useRef<Food[]>([]);
  const selectedDateRef = useRef(selectedDate);
  const entriesRef = useRef<LogEntry[]>([]);

  useEffect(() => {
    (async () => {
      const [s, f] = await Promise.all([storage.loadSettings(), storage.loadFavorites()]);
      setSettings(s);
      favoritesRef.current = f;
      setFavorites(f);
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
    (date: string, meal: MealType, food: Food, grams: number) =>
      mutateLog(date, (log) => [...log, { id: makeId(), meal, food, grams }]),
    [mutateLog]
  );

  const updateEntry = useCallback(
    (date: string, id: string, grams: number) =>
      mutateLog(date, (log) => log.map((e) => (e.id === id ? { ...e, grams } : e))),
    [mutateLog]
  );

  const removeEntry = useCallback(
    (date: string, id: string) => mutateLog(date, (log) => log.filter((e) => e.id !== id)),
    [mutateLog]
  );

  const value = useMemo<AppData>(
    () => ({
      ready,
      settings,
      saveSettings,
      favorites,
      isFavorite,
      toggleFavorite,
      selectedDate,
      setSelectedDate,
      entries,
      addEntry,
      updateEntry,
      removeEntry,
    }),
    [ready, settings, saveSettings, favorites, isFavorite, toggleFavorite, selectedDate, entries, addEntry, updateEntry, removeEntry]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}
