import type { WeightUnit } from './types';

export const ML_PER_FL_OZ = 29.5735;

/** Water is shown in fl oz for people who use lb, ml otherwise; it's always stored in ml. */
export type WaterUnit = 'ml' | 'oz';

export const waterUnitFor = (weightUnit: WeightUnit): WaterUnit => (weightUnit === 'lb' ? 'oz' : 'ml');

export const mlToUnit = (ml: number, u: WaterUnit) => (u === 'ml' ? ml : ml / ML_PER_FL_OZ);
export const unitToMl = (v: number, u: WaterUnit) => (u === 'ml' ? v : v * ML_PER_FL_OZ);

/** "1,250 ml" / "42 oz", or "1.25 L" for big ml amounts when `compact`. */
export function fmtWater(ml: number, u: WaterUnit, compact = false): string {
  if (u === 'oz') return `${Math.round(mlToUnit(ml, u))} oz`;
  if (compact && ml >= 1000) return `${(Math.round(ml / 10) / 100).toString()} L`;
  return `${Math.round(ml).toLocaleString()} ml`;
}

/** Quick-add buttons: a glass, a bottle, a big bottle. */
export const WATER_PRESETS: Record<WaterUnit, number[]> = {
  ml: [250, 500, 750],
  oz: [8, 16, 24].map((oz) => oz * ML_PER_FL_OZ),
};

export const sumWater = (drinks: number[]) => drinks.reduce((a, b) => a + b, 0);
