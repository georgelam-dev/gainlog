import Storage from 'expo-sqlite/kv-store';

import { DEFAULT_SETTINGS, type Food, type FoodUnit, type LogEntry, type SavedMeal, type Settings } from './types';

/** Custom units keyed by food id. */
export type CustomUnits = Record<string, FoodUnit[]>;

const KEYS = {
  settings: 'settings',
  favorites: 'favorites',
  customUnits: 'customUnits',
  savedMeals: 'savedMeals',
  log: (date: string) => `log:${date}`,
};

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await Storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (e) {
    console.warn(`Failed to read ${key}`, e);
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await Storage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to write ${key}`, e);
  }
}

export const storage = {
  loadSettings: async () => ({
    ...DEFAULT_SETTINGS,
    ...(await readJSON<Partial<Settings>>(KEYS.settings, {})),
  }),
  saveSettings: (s: Settings) => writeJSON(KEYS.settings, s),

  loadFavorites: () => readJSON<Food[]>(KEYS.favorites, []),
  saveFavorites: (f: Food[]) => writeJSON(KEYS.favorites, f),

  loadCustomUnits: () => readJSON<CustomUnits>(KEYS.customUnits, {}),
  saveCustomUnits: (u: CustomUnits) => writeJSON(KEYS.customUnits, u),

  loadSavedMeals: () => readJSON<SavedMeal[]>(KEYS.savedMeals, []),
  saveSavedMeals: (m: SavedMeal[]) => writeJSON(KEYS.savedMeals, m),

  loadLog: (date: string) => readJSON<LogEntry[]>(KEYS.log(date), []),
  saveLog: (date: string, entries: LogEntry[]) => writeJSON(KEYS.log(date), entries),
};
