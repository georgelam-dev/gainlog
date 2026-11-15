import data from '@/data/exercises.json';

import type { Exercise, Tracking } from './workoutTypes';

const TIMED_NAME = /^plank|side plank|wall sit|\bhold\b|dead hang|isometric (?!wipers)|\bcarry\b|farmer/i;

/** Cardio, planks, holds and carries are timed; everything else counts reps. */
export function defaultTracking(e: Exercise | undefined): Tracking {
  if (!e) return 'reps';
  if (e.tracking) return e.tracking;
  return e.category === 'cardio' || TIMED_NAME.test(e.name) ? 'time' : 'reps';
}

/** ~750 exercises from free-exercise-db (public domain), stretches removed. */
export const BUILT_IN_EXERCISES = data as Exercise[];

export const MUSCLES = [
  'chest',
  'shoulders',
  'triceps',
  'biceps',
  'forearms',
  'lats',
  'middle back',
  'lower back',
  'traps',
  'abdominals',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'adductors',
  'abductors',
  'neck',
] as const;

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'body only',
  'kettlebells',
  'bands',
  'e-z curl bar',
  'medicine ball',
  'exercise ball',
  'other',
] as const;

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Custom exercises first so they're easy to find, then the library. */
export function allExercises(custom: Exercise[]): Exercise[] {
  return [...custom, ...BUILT_IN_EXERCISES];
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ');

/** Every typed word must appear in the name/equipment/muscle; name matches rank first. */
export function searchExercises(list: Exercise[], query: string, muscle?: string | null): Exercise[] {
  const words = normalize(query).split(' ').filter(Boolean);
  const filtered = list.filter((e) => {
    if (muscle && e.muscle !== muscle) return false;
    if (!words.length) return true;
    const hay = normalize(`${e.name} ${e.equipment ?? ''} ${e.muscle}`);
    return words.every((w) => hay.includes(w));
  });
  if (!words.length) return filtered;
  const q = normalize(query).trim();
  const score = (e: Exercise) => {
    const n = normalize(e.name);
    return n.startsWith(q) ? 0 : n.includes(q) ? 1 : 2;
  };
  return filtered
    .map((e, i) => ({ e, i, s: score(e) }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.e);
}
