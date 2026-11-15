import { makeId } from './date';
import type { WeightUnit } from './types';
import { fmtLoad, toUnit } from './weightUnits';
import type { SetType, Tracking, Workout, WorkoutExercise, WorkoutSet } from './workoutTypes';

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
): Pick<WorkoutSet, 'kg' | 'reps' | 'sec'> | undefined {
  const above = current
    .slice(0, index)
    .reverse()
    .find((s) => s.reps !== undefined || s.kg !== undefined || s.sec !== undefined);
  const prev = last[index] ?? last[last.length - 1];
  const src = above ?? prev;
  return src ? { kg: src.kg, reps: src.reps, sec: src.sec } : undefined;
}

export const isLogged = (s: WorkoutSet) => s.done && ((s.reps ?? 0) > 0 || (s.sec ?? 0) > 0);

// ---- Set types ------------------------------------------------------------

export const SET_TYPES: { key: SetType; label: string; short?: string }[] = [
  { key: 'normal', label: 'Normal' },
  { key: 'warmup', label: 'Warm-up', short: 'W' },
  { key: 'drop', label: 'Drop set', short: 'D' },
  { key: 'failure', label: 'Failure', short: 'F' },
];

export const setTypeLabel = (t: SetType | undefined) =>
  SET_TYPES.find((x) => x.key === (t ?? 'normal'))?.label ?? 'Normal';

/** What each set shows in its number column: working sets are numbered, the rest get a letter. */
export function setLabels(sets: WorkoutSet[]): string[] {
  let n = 0;
  return sets.map((s) => SET_TYPES.find((x) => x.key === s.type)?.short ?? String(++n));
}

// ---- Timed sets -----------------------------------------------------------

/** "1:30" / "1:02:05" from seconds. */
export const formatSec = (sec: number) => formatDuration(sec * 1000);

/**
 * Timer-style entry: digits fill from the right, so typing 1, 3, 0 reads 1:30.
 * Returns the text to show and the value in seconds.
 */
export function parseTimeInput(text: string): { text: string; sec?: number } {
  const d = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, 6);
  if (!d) return { text: '' };
  const ss = d.slice(-2).padStart(2, '0');
  const m = d.length > 2 ? Number(d.slice(-4, -2)) : 0;
  const h = d.length > 4 ? Number(d.slice(0, -4)) : 0;
  const shown = d.length > 4 ? `${h}:${d.slice(-4, -2)}:${ss}` : `${m}:${ss}`;
  return { text: shown, sec: h * 3600 + m * 60 + Number(ss) };
}

/** "100 × 5", "12 reps", "1:30", "20 · 1:30" (units appended when `withUnit`). */
export function formatSet(
  s: Pick<WorkoutSet, 'kg' | 'reps' | 'sec'> | undefined,
  tracking: Tracking,
  unit: WeightUnit,
  withUnit = false
): string {
  if (!s) return '—';
  const load = s.kg !== undefined ? `${fmtLoad(toUnit(s.kg, unit))}${withUnit ? ` ${unit}` : ''}` : undefined;
  if (tracking === 'time') {
    if (s.sec === undefined) return '—';
    return load ? `${load} · ${formatSec(s.sec)}` : formatSec(s.sec);
  }
  if (s.reps === undefined) return '—';
  return load ? `${load} × ${s.reps}` : `${s.reps} reps`;
}

// ---- Personal records -----------------------------------------------------

export type PRKind = 'weight' | 'e1rm' | 'reps' | 'time';

export const PR_LABELS: Record<PRKind, string> = {
  weight: 'Heaviest weight',
  e1rm: 'Best est. 1RM',
  reps: 'Most reps',
  time: 'Longest time',
};

/** Best values seen so far for one exercise (working sets only). */
export type Bests = { kg?: number; e1rm?: number; reps?: number; sec?: number };

const countsForPR = (s: WorkoutSet) => isLogged(s) && s.type !== 'warmup';
const maxOf = (a: number | undefined, b: number) => (a === undefined ? b : Math.max(a, b));

/** Records this set beats. No PR without an earlier baseline, so a first session isn't all trophies. */
export function prKinds(s: WorkoutSet, tracking: Tracking, best: Bests | undefined): PRKind[] {
  if (!best || !countsForPR(s)) return [];
  const out: PRKind[] = [];
  if (tracking === 'time') {
    if (s.sec && best.sec !== undefined && s.sec > best.sec) out.push('time');
  } else if (s.kg) {
    if (best.kg !== undefined && s.kg > best.kg + 1e-6) out.push('weight');
    if (best.e1rm !== undefined && e1rm(s.kg, s.reps ?? 0) > best.e1rm + 1e-6) out.push('e1rm');
  } else if (s.reps && best.reps !== undefined && s.reps > best.reps) {
    out.push('reps');
  }
  return out;
}

export function addToBests(best: Bests | undefined, s: WorkoutSet, tracking: Tracking): Bests | undefined {
  if (!countsForPR(s)) return best;
  const b: Bests = { ...best };
  if (tracking === 'time') {
    if (s.sec) b.sec = maxOf(b.sec, s.sec);
  } else if (s.kg) {
    b.kg = maxOf(b.kg, s.kg);
    b.e1rm = maxOf(b.e1rm, e1rm(s.kg, s.reps ?? 0));
  } else if (s.reps) {
    b.reps = maxOf(b.reps, s.reps);
  }
  return b;
}

/**
 * Walk one workout's sets in order, flagging PRs against `bests` (exercise id → bests),
 * which is updated in place. Returns set id → records beaten.
 */
export function markPRs(w: Workout, bests: Map<string, Bests>): Map<string, PRKind[]> {
  const prs = new Map<string, PRKind[]>();
  for (const ex of w.exercises) {
    const tracking = ex.tracking ?? 'reps';
    let best = bests.get(ex.exerciseId);
    for (const s of ex.sets) {
      const kinds = prKinds(s, tracking, best);
      if (kinds.length) prs.set(s.id, kinds);
      best = addToBests(best, s, tracking);
    }
    if (best) bests.set(ex.exerciseId, best);
  }
  return prs;
}

// ---- Supersets ------------------------------------------------------------

type Groupable = { groupId?: string };

/** Keep each group one contiguous run of 2+ exercises; strays are split off or ungrouped. */
export function normalizeGroups<T extends Groupable>(list: T[]): T[] {
  const used = new Set<string>();
  const out = list.slice();
  let i = 0;
  while (i < out.length) {
    const g = out[i].groupId;
    if (!g) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < out.length && out[j + 1].groupId === g) j++;
    if (j === i) out[i] = { ...out[i], groupId: undefined };
    else if (used.has(g)) {
      const fresh = makeId();
      for (let k = i; k <= j; k++) out[k] = { ...out[k], groupId: fresh };
    }
    used.add(g);
    i = j + 1;
  }
  return out;
}

/** Join item `index` with the one after it, merging their whole groups. */
export function linkWithNext<T extends Groupable>(list: T[], index: number): T[] {
  if (index < 0 || index + 1 >= list.length) return list;
  const a = list[index].groupId;
  const b = list[index + 1].groupId;
  const target = a ?? b ?? makeId();
  return normalizeGroups(
    list.map((x, k) =>
      k === index || k === index + 1 || (x.groupId && (x.groupId === a || x.groupId === b))
        ? { ...x, groupId: target }
        : x
    )
  );
}

/** Break a group between `index` and `index + 1`; each side stays grouped if it still has 2+. */
export function splitAfter<T extends Groupable>(list: T[], index: number): T[] {
  const g = list[index]?.groupId;
  if (!g) return list;
  const fresh = makeId();
  return normalizeGroups(list.map((x, k) => (k > index && x.groupId === g ? { ...x, groupId: fresh } : x)));
}

/** Take item `index` out of its group. */
export function unlink<T extends Groupable>(list: T[], index: number): T[] {
  return normalizeGroups(list.map((x, k) => (k === index ? { ...x, groupId: undefined } : x)));
}

export type GroupInfo = {
  /** "A", "B", … in list order */
  letter: string;
  size: number;
  /** 0-based position inside the group */
  position: number;
  /** Index into a colour palette */
  colorIndex: number;
};

export function groupInfo(list: Groupable[]): (GroupInfo | undefined)[] {
  const sizes = new Map<string, number>();
  for (const x of list) if (x.groupId) sizes.set(x.groupId, (sizes.get(x.groupId) ?? 0) + 1);
  const order = new Map<string, number>();
  const seen = new Map<string, number>();
  return list.map((x) => {
    const g = x.groupId;
    const size = g ? (sizes.get(g) ?? 0) : 0;
    if (!g || size < 2) return undefined;
    if (!order.has(g)) order.set(g, order.size);
    const n = order.get(g) ?? 0;
    const position = seen.get(g) ?? 0;
    seen.set(g, position + 1);
    return { letter: String.fromCharCode(65 + (n % 26)), size, position, colorIndex: n };
  });
}

export const groupName = (size: number) => (size > 2 ? 'Circuit' : 'Superset');

/** True when the next exercise is in the same group, so rest waits until the round ends. */
export function continuesGroup(list: Groupable[], index: number): boolean {
  const g = list[index]?.groupId;
  return !!g && list[index + 1]?.groupId === g;
}

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
