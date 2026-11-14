import type { Food, NutrientKey, Nutrients } from './types';
import { servingLabelFrom } from './units';

/**
 * Open Food Facts — free, open, no API key.
 * Search uses Search-a-licious (search.openfoodfacts.org), with the legacy
 * cgi/search.pl endpoint as a fallback. OFF limits search to ~10 req/min/IP,
 * so callers should not search on every keystroke.
 */
const USER_AGENT = 'Gainlog/1.0 (Android food tracker)';
const FIELDS = 'code,product_name,brands,nutriments,serving_quantity,serving_size';
const PAGE_SIZE = 25;

type OffNutriments = Record<string, number | string | undefined>;

type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string | string[];
  nutriments?: OffNutriments;
  serving_quantity?: number | string;
  serving_size?: string;
};

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

/** OFF nutriment names; OFF normalises every *_100g value to grams. */
const OFF_NUTRIENTS: Record<NutrientKey, string> = {
  fiber: 'fiber',
  sugars: 'sugars',
  saturatedFat: 'saturated-fat',
  monoFat: 'monounsaturated-fat',
  transFat: 'trans-fat',
  cholesterol: 'cholesterol',
  sodium: 'sodium',
  potassium: 'potassium',
  vitaminA: 'vitamin-a',
  vitaminC: 'vitamin-c',
  calcium: 'calcium',
  iron: 'iron',
};

function toNutrients(n: OffNutriments): Nutrients {
  const out: Nutrients = {};
  for (const [key, off] of Object.entries(OFF_NUTRIENTS) as [NutrientKey, string][]) {
    const v = num(n[`${off}_100g`]);
    if (v !== undefined && v >= 0) out[key] = v;
  }
  // EU labels often give salt only; sodium = salt / 2.5.
  if (out.sodium === undefined) {
    const salt = num(n['salt_100g']);
    if (salt !== undefined && salt >= 0) out.sodium = salt / 2.5;
  }
  return out;
}

function toFood(p: OffProduct): Food | null {
  const name = p.product_name?.trim();
  const n = p.nutriments ?? {};
  let kcal = num(n['energy-kcal_100g']);
  if (kcal === undefined) {
    const kj = num(n['energy_100g']) ?? num(n['energy-kj_100g']);
    if (kj !== undefined) kcal = kj / 4.184;
  }
  if (!p.code || !name || kcal === undefined) return null;

  const brandRaw = Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(',')[0];
  const servingG = num(p.serving_quantity);

  return {
    id: p.code,
    name,
    brand: brandRaw?.trim() || undefined,
    per100g: {
      kcal,
      protein: num(n['proteins_100g']) ?? 0,
      carbs: num(n['carbohydrates_100g']) ?? 0,
      fat: num(n['fat_100g']) ?? 0,
    },
    nutrients: toNutrients(n),
    servingG: servingG && servingG > 0 ? servingG : undefined,
    servingLabel: servingG && servingG > 0 ? servingLabelFrom(p.serving_size) : undefined,
  };
}

function dedupe(foods: Food[]): Food[] {
  const seen = new Set<string>();
  return foods.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
}

async function getJSON(url: string, signal?: AbortSignal): Promise<any> {
  const res = await fetch(url, {
    signal,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function searchFoods(query: string, signal?: AbortSignal): Promise<Food[]> {
  const q = encodeURIComponent(query.trim());
  try {
    const data = await getJSON(
      `https://search.openfoodfacts.org/search?q=${q}&page_size=${PAGE_SIZE}&fields=${FIELDS}`,
      signal
    );
    const hits: OffProduct[] = data?.hits ?? [];
    return dedupe(hits.map(toFood).filter((f): f is Food => f !== null));
  } catch (e) {
    if (signal?.aborted) throw e;
    // Fall back to the legacy full-text search endpoint.
    const data = await getJSON(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=${PAGE_SIZE}&fields=${FIELDS}`,
      signal
    );
    const products: OffProduct[] = data?.products ?? [];
    return dedupe(products.map(toFood).filter((f): f is Food => f !== null));
  }
}


/** Look up one product by its barcode. Returns null if OFF doesn't know it (or lacks calories). */
export async function fetchFoodByBarcode(code: string, signal?: AbortSignal): Promise<Food | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`,
    { signal, headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data?.status === 1 && data.product ? toFood({ ...data.product, code }) : null;
}
