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

export type NutriScore = 'a' | 'b' | 'c' | 'd' | 'e';

/** Extra product info shown on the food detail screen (fetched live, not stored). */
export type FoodDetails = {
  imageUrl?: string;
  ingredientsImageUrl?: string;
  /** Pack size as printed, e.g. "400 g" */
  quantity?: string;
  ingredients?: string;
  allergens: string[];
  traces: string[];
  additives: string[];
  labels: string[];
  categories: string[];
  /** 1 (unprocessed) – 4 (ultra-processed) */
  nova?: number;
  /** e.g. { sugars: 'high', salt: 'low' } */
  levels: Partial<Record<'fat' | 'saturated-fat' | 'sugars' | 'salt', 'low' | 'moderate' | 'high'>>;
  /** From OFF's ingredient analysis: true / false / undefined (unknown or "maybe") */
  vegan?: boolean;
  vegetarian?: boolean;
  palmOil?: boolean;
};

export type Food = {
  /** Open Food Facts barcode */
  id: string;
  name: string;
  brand?: string;
  per100g: Macros;
  /** Undefined on foods saved before nutrients were tracked. */
  nutrients?: Nutrients;
  /** Nutri-Score grade from Open Food Facts, when the product has one */
  nutriscore?: NutriScore;
  /** Quick add: macros typed in by hand, stored as one 100 g "serving". */
  quick?: boolean;
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

/** A recently logged food, with the amount it was last logged at. */
export type RecentFood = {
  food: Food;
  grams: number;
  unit?: EntryUnit;
};

/** Bodyweight on a given day (YYYY-MM-DD), always stored in kg. */
export type WeightEntry = {
  date: string;
  kg: number;
};

export type WeightUnit = 'kg' | 'lb';

export type MacroMode = 'percent' | 'grams';

export type Settings = {
  calories: number;
  macroMode: MacroMode;
  /** Percent (0-100) or grams, depending on macroMode */
  carbs: number;
  protein: number;
  fat: number;
  /** kg or lb for bodyweight and workout weights; everything is stored in kg. */
  weightUnit: WeightUnit;
};

export const DEFAULT_SETTINGS: Settings = {
  calories: 2000,
  macroMode: 'percent',
  carbs: 50,
  protein: 25,
  fat: 25,
  weightUnit: 'kg',
};
