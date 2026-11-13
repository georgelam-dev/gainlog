export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'preworkout' | 'snack';

export const MEALS: { key: MealType; label: string;}[] = [
  { key: 'breakfast', label: 'Breakfast'},
  { key: 'lunch', label: 'Lunch'},
  { key: 'dinner', label: 'Dinner'},
  { key: 'preworkout', label: 'Pre-workout'},
  { key: 'snack', label: 'Snack'},
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

export const NUTRIENT_KEYS = [
  'fiber',
  'sugars',
  'saturatedFat',
  'monoFat',
  'transFat',
  'cholesterol',
  'sodium',
  'potassium',
  'vitaminA',
  'vitaminC',
  'calcium',
  'iron',
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

/** Extra nutrients in grams per 100 g. A missing key means the product doesn't report it. */
export type Nutrients = Partial<Record<NutrientKey, number>>;

export type Food = {
  /** Open Food Facts barcode */
  id: string;
  name: string;
  brand?: string;
  per100g: Macros;
  /** Undefined on foods saved before nutrients were tracked. */
  nutrients?: Nutrients;
  /** Serving size in grams, if the product declares one */
  servingG?: number;
  /** Human label for that serving, e.g. "egg" or "serving (2 slices)" */
  servingLabel?: string;
};

/** A countable unit for a food, e.g. "large egg" = 50 g. */
export type FoodUnit = {
  label: string;
  grams: number;
};

/** How an entry was entered when logged by unit, e.g. 2 × large egg. */
export type EntryUnit = FoodUnit & { qty: number };

export type LogEntry = {
  id: string;
  meal: MealType;
  /** Total grams — always the source of truth for macros */
  grams: number;
  /** Present when logged by unit rather than by weight */
  unit?: EntryUnit;
  /** Full copy of the food so past logs stay accurate */
  food: Food;
};

/** One food + amount inside a saved meal. */
export type MealItem = {
  id: string;
  food: Food;
  grams: number;
  unit?: EntryUnit;
};

/** A reusable combination of foods, e.g. "Daily breakfast" = 3 eggs + 175 g yogurt. */
export type SavedMeal = {
  id: string;
  name: string;
  items: MealItem[];
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
