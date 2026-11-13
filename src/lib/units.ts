import type { EntryUnit, Food, FoodUnit } from './types';

/**
 * Typical edible weights for common whole foods (USDA FoodData Central averages).
 * Matched against the food name; first matching rule wins.
 */
const COMMON_UNITS: { match: RegExp; exclude?: RegExp; units: FoodUnit[] }[] = [
  { match: /\begg ?whites?\b|\bblanc d'?oeuf/i, units: [{ label: 'large egg white', grams: 33 }] },
  { match: /\begg ?yolks?\b|\bjaune d'?oeuf/i, units: [{ label: 'large egg yolk', grams: 17 }] },
  {
    match: /\beggs?\b|\boeufs?\b|\beier?\b|\bhuevos?\b/i,
    exclude: /noodle|pasta|nog|plant|roll|salad|mayo/i,
    units: [
      { label: 'small egg', grams: 38 },
      { label: 'medium egg', grams: 44 },
      { label: 'large egg', grams: 50 },
      { label: 'extra large egg', grams: 56 },
      { label: 'jumbo egg', grams: 63 },
    ],
  },
  {
    match: /\bbananas?\b/i,
    exclude: /chips?|bread|cake|milk|shake|yogh?urt|dried/i,
    units: [
      { label: 'small banana', grams: 101 },
      { label: 'medium banana', grams: 118 },
      { label: 'large banana', grams: 136 },
    ],
  },
  {
    match: /\bapples?\b/i,
    exclude: /juice|sauce|pie|chips?|cider|vinegar|dried/i,
    units: [
      { label: 'small apple', grams: 149 },
      { label: 'medium apple', grams: 182 },
      { label: 'large apple', grams: 223 },
    ],
  },
  {
    match: /\boranges?\b/i,
    exclude: /juice|jam|marmalade|soda|drink/i,
    units: [
      { label: 'small orange', grams: 96 },
      { label: 'medium orange', grams: 131 },
      { label: 'large orange', grams: 184 },
    ],
  },
  { match: /\bbread\b|\btoast\b/i, exclude: /crumbs?/i, units: [{ label: 'slice', grams: 30 }] },
];

/** Unit choices for a food: its own serving, custom units, then common-food defaults. */
export function unitsFor(food: Food, custom: FoodUnit[] = []): FoodUnit[] {
  const out: FoodUnit[] = [];
  if (food.servingG) out.push({ label: food.servingLabel || 'serving', grams: food.servingG });
  out.push(...custom);
  const rule = COMMON_UNITS.find((r) => r.match.test(food.name) && !r.exclude?.test(food.name));
  if (rule) out.push(...rule.units);
  // Drop duplicate labels, keeping the first (product/custom beats defaults).
  const seen = new Set<string>();
  return out.filter((u) => {
    const k = u.label.toLowerCase();
    return seen.has(k) ? false : (seen.add(k), true);
  });
}

/**
 * Turn an OFF serving_size string into a unit label.
 * "1 egg (50 g)" → "egg", "2 slices (60g)" → "serving (2 slices)", "30 g" → undefined.
 */
export function servingLabelFrom(servingSize: string | undefined): string | undefined {
  if (!servingSize) return undefined;
  const text = servingSize.replace(/\([^)]*\)/g, '').trim();
  if (!text || /^[\d.,\s]*(g|gr|grams?|ml|mL)?$/i.test(text)) return undefined;
  const single = text.match(/^1\s+([^\d].*)$/);
  if (single) return single[1].trim().toLowerCase();
  return `serving (${text.toLowerCase()})`;
}

/** "3 × large egg" for unit entries, "175 g" for weighed ones. */
export function describeAmount({ grams, unit }: { grams: number; unit?: EntryUnit }): string {
  const round1 = (n: number) => (Math.round(n * 10) / 10).toString();
  return unit ? `${round1(unit.qty)} × ${unit.label}` : `${Math.round(grams)} g`;
}
