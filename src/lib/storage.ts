import Storage from 'expo-sqlite/kv-store';

import {
  DEFAULT_SETTINGS,
  type Food,
  type FoodUnit,
  type LogEntry,
  type RecentFood,
  type SavedMeal,
  type Settings,
  type WeightEntry,
} from './types';
import type { Exercise, Routine, Workout } from './workoutTypes';

/** Custom units keyed by food id. */
export type CustomUnits = Record<string, FoodUnit[]>;

const KEYS = {
  settings: 'settings',
  favorites: 'favorites',
  customUnits: 'customUnits',
  savedMeals: 'savedMeals',
  recentFoods: 'recentFoods',
  weights: 'weights',
  customExercises: 'customExercises',
  routines: 'routines',
  workouts: 'workouts',
  activeWorkout: 'activeWorkout',
  exerciseRest: 'exerciseRest',
  log: (date: string) => `log:${date}`,
  water: (date: string) => `water:${date}`,
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

  loadRecentFoods: () => readJSON<RecentFood[]>(KEYS.recentFoods, []),
  saveRecentFoods: (r: RecentFood[]) => writeJSON(KEYS.recentFoods, r),

  loadWeights: () => readJSON<WeightEntry[]>(KEYS.weights, []),
  saveWeights: (w: WeightEntry[]) => writeJSON(KEYS.weights, w),

  loadCustomExercises: () => readJSON<Exercise[]>(KEYS.customExercises, []),
  saveCustomExercises: (e: Exercise[]) => writeJSON(KEYS.customExercises, e),

  loadRoutines: () => readJSON<Routine[]>(KEYS.routines, []),
  saveRoutines: (r: Routine[]) => writeJSON(KEYS.routines, r),

  /** Finished workouts, newest first. */
  loadWorkouts: () => readJSON<Workout[]>(KEYS.workouts, []),
  saveWorkouts: (w: Workout[]) => writeJSON(KEYS.workouts, w),

  /** The workout in progress (null when none), saved on every change. */
  loadActiveWorkout: () => readJSON<Workout | null>(KEYS.activeWorkout, null),
  saveActiveWorkout: (w: Workout | null) => writeJSON(KEYS.activeWorkout, w),

  /** Rest timer (seconds) remembered per exercise id. */
  loadExerciseRest: () => readJSON<Record<string, number>>(KEYS.exerciseRest, {}),
  saveExerciseRest: (r: Record<string, number>) => writeJSON(KEYS.exerciseRest, r),

  loadLog: (date: string) => readJSON<LogEntry[]>(KEYS.log(date), []),
  saveLog: (date: string, entries: LogEntry[]) => writeJSON(KEYS.log(date), entries),

  /** Each drink logged that day, in ml (a list so the last one can be undone). */
  loadWater: (date: string) => readJSON<number[]>(KEYS.water(date), []),
  saveWater: (date: string, drinks: number[]) => writeJSON(KEYS.water(date), drinks),
};

/** Backup file format: every stored key, as its raw JSON string. */
export type Backup = {
  app: 'gainlog';
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
};

export async function exportAll(): Promise<Backup> {
  const keys = await Storage.getAllKeys();
  const pairs = await Storage.multiGet(keys);
  const data: Record<string, string> = {};
  for (const [k, v] of pairs) if (v !== null) data[k] = v;
  return { app: 'gainlog', version: 1, exportedAt: new Date().toISOString(), data };
}

/** Validate a parsed backup file; throws a user-readable message if it isn't one. */
export function parseBackup(raw: unknown): Backup {
  const b = raw as Partial<Backup> | null;
  if (!b || b.app !== 'gainlog' || typeof b.data !== 'object' || b.data === null) {
    throw new Error('This file is not a Gainlog backup.');
  }
  if (b.version !== 1) throw new Error('This backup was made by a newer version of Gainlog.');
  for (const [k, v] of Object.entries(b.data)) {
    if (typeof v !== 'string') throw new Error(`Backup entry "${k}" is invalid.`);
    JSON.parse(v); // throws on corrupt values before we touch existing data
  }
  return b as Backup;
}

/** Replace ALL stored data with the backup's contents. */
export async function importAll(backup: Backup): Promise<void> {
  const previous = await exportAll();
  try {
    await Storage.clear();
    await Storage.multiSet(Object.entries(backup.data));
  } catch (e) {
    // Put the phone's original data back rather than leaving it half-imported.
    await Storage.clear();
    await Storage.multiSet(Object.entries(previous.data));
    throw e;
  }
}
