import type { Workout, WorkoutExercise, WorkoutSet } from './workoutTypes';

/** Epley estimated one-rep max. */
export const e1rm = (kg: number, reps: number) => (reps <= 1 ? kg : kg * (1 + reps / 30));

/**
 * Values to pre-fill a set with: the set above it in this workout, else the same set
 * number from last time, else last time's final set.
 */
export function suggestSet(
  current: WorkoutSet[],
  index: number,
  last: WorkoutSet[]
): Pick<WorkoutSet, 'kg' | 'reps'> | undefined {
  const above = current
    .slice(0, index)
    .reverse()
    .find((s) => s.reps !== undefined || s.kg !== undefined);
  const prev = last[index] ?? last[last.length - 1];
  const src = above ?? prev;
  return src ? { kg: src.kg, reps: src.reps } : undefined;
}

export const isLogged =(s: WorkoutSet) => s.done && (s.reps ?? 0) > 0;

/** Total weight moved (kg × reps) across completed sets. */
export function volumeKg(exercises: WorkoutExercise[]): number {
  let v = 0;
  for (const ex of exercises) for (const s of ex.sets) if (isLogged(s)) v += (s.kg ?? 0) * (s.reps ?? 0);
  return v;
}

export function countDoneSets(exercises: WorkoutExercise[]): number {
  return exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.done).length, 0);
}

/** "1:05:09" or "5:09". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** "1h 5m" / "42m" for history lists. */
export function formatDurationShort(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`;
}

/** "Off", "45s", "1:30", "2m". */
export function formatRest(sec: number): string {
  if (sec <= 0) return 'Off';
  if (sec < 60) return `${sec}s`;
  return sec % 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : `${sec / 60}m`;
}

export function defaultWorkoutName(at = new Date()): string {
  const h = at.getHours();
  return h < 11 ? 'Morning workout' : h < 17 ? 'Afternoon workout' : 'Evening workout';
}

export function workoutDateLabel(w: Pick<Workout, 'startedAt'>): string {
  return new Date(w.startedAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
