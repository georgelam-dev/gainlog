export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'preworkout' | 'snack';

export const MEALS: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: '🍳' },
  { key: 'lunch', label: 'Lunch', icon: '🥗' },
  { key: 'dinner', label: 'Dinner', icon: '🍝' },
  { key: 'preworkout', label: 'Pre-workout', icon: '⚡' },
  { key: 'snack', label: 'Snack', icon: '🍎' },
];

export function isMealType(value: unknown): value is MealType {
  return MEALS.some((m) => m.key === value);
}

export type Macros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Food = {
  /** Open Food Facts barcode */
  id: string;
  name: string;
  brand?: string;
  per100g: Macros;
  /** Serving size in grams, if the product declares one */
  servingG?: number;
};

export type LogEntry = {
  id: string;
  meal: MealType;
  grams: number;
  /** Full copy of the food so past logs stay accurate */
  food: Food;
};

export type MacroMode = 'percent' | 'grams';

export type Settings = {
  calories: number;
  macroMode: MacroMode;
  /** Percent (0-100) or grams, depending on macroMode */
  carbs: number;
  protein: number;
  fat: number;
};

export const DEFAULT_SETTINGS: Settings = {
  calories: 2000,
  macroMode: 'percent',
  carbs: 50,
  protein: 25,
  fat: 25,
};
