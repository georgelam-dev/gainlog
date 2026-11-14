import type { WeightUnit } from './types';

export const LB_PER_KG = 2.20462;

export const toUnit = (kg: number, u: WeightUnit) => (u === 'kg' ? kg : kg * LB_PER_KG);
export const toKg = (v: number, u: WeightUnit) => (u === 'kg' ? v : v / LB_PER_KG);

/** One decimal, always shown: "72.5" / "72.0". */
export const fmtW = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

/** Up to one decimal, trailing zero dropped: "72.5" / "72". */
export const fmtLoad = (v: number) => String(Math.round(v * 10) / 10);

/** Parse a user-typed number ("72,5" works too); undefined if blank or invalid. */
export function parseNum(text: string): number | undefined {
  const n = parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
