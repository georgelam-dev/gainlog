import type { Food, LogEntry, Macros, Settings } from './types';

export const KCAL_PER_GRAM = { carbs: 4, protein: 4, fat: 9 } as const;

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function scale(food: Food, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: food.per100g.kcal * f,
    protein: food.per100g.protein * f,
    carbs: food.per100g.carbs * f,
    fat: food.per100g.fat * f,
  };
}

export function add(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

export function sumEntries(entries: LogEntry[]): Macros {
  return entries.reduce((acc, e) => add(acc, scale(e.food, e.grams)), ZERO_MACROS);
}

export function kcalFromGrams(carbs: number, protein: number, fat: number): number {
  return carbs * KCAL_PER_GRAM.carbs + protein * KCAL_PER_GRAM.protein + fat * KCAL_PER_GRAM.fat;
}

/** Daily targets in grams (and kcal) derived from settings. */
export function macroTargets(s: Settings): Macros {
  if (s.macroMode === 'grams') {
    return { kcal: s.calories, carbs: s.carbs, protein: s.protein, fat: s.fat };
  }
  return {
    kcal: s.calories,
    carbs: (s.calories * s.carbs) / 100 / KCAL_PER_GRAM.carbs,
    protein: (s.calories * s.protein) / 100 / KCAL_PER_GRAM.protein,
    fat: (s.calories * s.fat) / 100 / KCAL_PER_GRAM.fat,
  };
}

/** Convert percentages to grams for a calorie goal. */
export function percentToGrams(calories: number, carbs: number, protein: number, fat: number) {
  return {
    carbs: Math.round((calories * carbs) / 100 / KCAL_PER_GRAM.carbs),
    protein: Math.round((calories * protein) / 100 / KCAL_PER_GRAM.protein),
    fat: Math.round((calories * fat) / 100 / KCAL_PER_GRAM.fat),
  };
}

/** Convert grams to percentages of their implied calories (sums to 100). */
export function gramsToPercent(carbs: number, protein: number, fat: number) {
  const total = kcalFromGrams(carbs, protein, fat);
  if (total <= 0) return { carbs: 50, protein: 25, fat: 25 };
  const c = Math.round(((carbs * KCAL_PER_GRAM.carbs) / total) * 100);
  const p = Math.round(((protein * KCAL_PER_GRAM.protein) / total) * 100);
  return { carbs: c, protein: p, fat: 100 - c - p };
}

export function fmt(n: number): string {
  return Math.round(n).toString();
}

export function fmt1(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}
