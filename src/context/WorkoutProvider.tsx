import { useKeepAwake } from 'expo-keep-awake';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { RestTicker } from '@/components/workout/RestTicker';
import { moveItem } from '@/lib/array';
import { makeId } from '@/lib/date';
import { allExercises } from '@/lib/exercises';
import { cancelRestEnd, ensureRestAlerts, scheduleRestEnd } from '@/lib/restAlerts';
import { storage } from '@/lib/storage';
import { defaultWorkoutName, e1rm, isLogged, suggestSet } from '@/lib/workout';
import type {
  Exercise,
  ExerciseSession,
  RestTimer,
  Routine,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '@/lib/workoutTypes';

type WorkoutData = {
  ready: boolean;
  /** Re-read everything from storage (after importing a backup). */
  reload: () => Promise<void>;

  exercises: Exercise[];
  getExercise: (id: string) => Exercise | undefined;
  customExercises: Exercise[];
  addCustomExercise: (e: Omit<Exercise, 'id' | 'custom'>) => Exercise;

  routines: Routine[];
  /** Insert or replace (by id). */
  saveRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
  /** Routine being built/edited; the exercise picker appends to it. */
  routineDraft: Routine | null;
  setRoutineDraft: (d: Routine | null | ((d: Routine | null) => Routine | null)) => void;

  /** Finished workouts, newest first. */
  workouts: Workout[];
  deleteWorkout: (id: string) => void;
  historyFor: (exerciseId: string) => ExerciseSession[];
  /** Completed sets from the last session of this exercise (for "Previous" and pre-fill). */
  lastSetsFor: (exerciseId: string) => WorkoutSet[];

  active: Workout | null;
  /** Returns false if a workout is already in progress. */
  startWorkout: (routine?: Routine) => boolean;
  renameActive: (name: string) => void;
  addExercises: (ids: string[]) => void;
  removeExercise: (exId: string) => void;
  /** Move an exercise in the active workout from one position to another. */
  moveExercise: (from: number, to: number) => void;
  /** Set the rest timer for an exercise in the active workout (and remember it for next time). */
  setExerciseRest: (exId: string, sec: number) => void;
  /** Remembered rest timer for an exercise (2 minutes until changed). */
  restFor: (exerciseId: string) => number;
  /** Remember a rest timer for an exercise, e.g. when it's changed in a routine. */
  rememberRest: (exerciseId: string, sec: number) => void;
  addSet: (exId: string) => void;
  removeSet: (exId: string, setId: string) => void;
  updateSet: (exId: string, setId: string, patch: Partial<Omit<WorkoutSet, 'id'>>) => void;
  /** Tick/untick a set. Empty fields are filled from the suggestion; ticking starts the rest timer. */
  toggleSetDone: (exId: string, setId: string) => 'done' | 'undone' | 'needs-reps';
  /** Save to history, dropping unfinished sets. Resolves to the saved workout, or null if nothing was done. */
  finishWorkout: () => Promise<Workout | null>;
  discardWorkout: () => void;

  rest: RestTimer | null;
  startRest: (sec: number) => void;
  adjustRest: (deltaSec: number) => void;
  skipRest: () => void;
};

const WorkoutContext = createContext<WorkoutData | null>(null);

/** Rest timer for an exercise until the user picks another one for it. */
export const DEFAULT_REST_SEC = 120;

const fetchAll = () =>
  Promise.all([
    storage.loadCustomExercises(),
    storage.loadRoutines(),
    storage.loadWorkouts(),
    storage.loadActiveWorkout(),
    storage.loadExerciseRest(),
  ]);

const emptySets = (n: number): WorkoutSet[] =>
  Array.from({ length: Math.max(1, n) }, () => ({ id: makeId(), done: false }));

function KeepAwake() {
  useKeepAwake('active-workout', { suppressDeactivateWarnings: true });
  return null;
}

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineDraft, setRoutineDraft] = useState<Routine | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [active, setActive] = useState<Workout | null>(null);
  const [rest, setRest] = useState<RestTimer | null>(null);
  const [restByExercise, setRestByExercise] = useState<Record<string, number>>({});

  const customRef = useRef<Exercise[]>([]);
  const routinesRef = useRef<Routine[]>([]);
  const workoutsRef = useRef<Workout[]>([]);
  const activeRef = useRef<Workout | null>(null);
  const restRef = useRef<RestTimer | null>(null);
  const notifIdRef = useRef<string | null>(null);
  const restByExerciseRef = useRef<Record<string, number>>({});

  const applyAll = useCallback((data: Awaited<ReturnType<typeof fetchAll>>) => {
    const [c, r, w, a, rb] = data;
    restByExerciseRef.current = rb;
    setRestByExercise(rb);
    customRef.current = c;
    setCustomExercises(c);
    routinesRef.current = r;
    setRoutines(r);
    workoutsRef.current = w;
    setWorkouts(w);
    activeRef.current = a;
    setActive(a);
  }, []);

  useEffect(() => {
    fetchAll().then((data) => {
      applyAll(data);
      setReady(true);
    });
  }, [applyAll]);

  // ---- Rest timer -------------------------------------------------------

  const setRestTimer = useCallback((next: RestTimer | null) => {
    restRef.current = next;
    setRest(next);
    const prevId = notifIdRef.current;
    notifIdRef.current = null;
    cancelRestEnd(prevId);
    if (next) {
      scheduleRestEnd(next.endsAt).then((id) => {
        // Only keep the id if this timer is still the current one.
        if (restRef.current === next) notifIdRef.current = id;
        else cancelRestEnd(id);
      });
    }
  }, []);

  const startRest = useCallback(
    (sec: number) => {
      if (sec <= 0) return;
      setRestTimer({ endsAt: Date.now() + sec * 1000, totalSec: sec });
    },
    [setRestTimer]
  );

  const adjustRest = useCallback(
    (delta: number) => {
      const r = restRef.current;
      if (!r) return;
      const endsAt = r.endsAt + delta * 1000;
      if (endsAt <= Date.now() + 1000) return setRestTimer(null);
      setRestTimer({ endsAt, totalSec: Math.max(1, r.totalSec + delta) });
    },
    [setRestTimer]
  );

  const skipRest = useCallback(() => setRestTimer(null), [setRestTimer]);

  /** Called by the ticker when the countdown reaches zero (notification has fired or is suppressed). */
  const restFinished = useCallback(() => {
    notifIdRef.current = null;
    restRef.current = null;
    setRest(null);
  }, []);

  // ---- Library ----------------------------------------------------------

  const exercises = useMemo(() => allExercises(customExercises), [customExercises]);
  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const getExercise = useCallback((id: string) => exerciseMap.get(id), [exerciseMap]);

  const addCustomExercise = useCallback((e: Omit<Exercise, 'id' | 'custom'>) => {
    const ex: Exercise = { ...e, id: `custom:${makeId()}`, custom: true };
    const next = [ex, ...customRef.current];
    customRef.current = next;
    setCustomExercises(next);
    storage.saveCustomExercises(next);
    return ex;
  }, []);

  // ---- Routines ---------------------------------------------------------

  const mutateRoutines = useCallback((fn: (r: Routine[]) => Routine[]) => {
    const next = fn(routinesRef.current);
    routinesRef.current = next;
    setRoutines(next);
    storage.saveRoutines(next);
  }, []);

  const saveRoutine = useCallback(
    (r: Routine) =>
      mutateRoutines((list) =>
        list.some((x) => x.id === r.id) ? list.map((x) => (x.id === r.id ? r : x)) : [...list, r]
      ),
    [mutateRoutines]
  );
  const deleteRoutine = useCallback(
    (id: string) => mutateRoutines((list) => list.filter((x) => x.id !== id)),
    [mutateRoutines]
  );

  // ---- History ----------------------------------------------------------

  const deleteWorkout = useCallback((id: string) => {
    const next = workoutsRef.current.filter((w) => w.id !== id);
    workoutsRef.current = next;
    setWorkouts(next);
    storage.saveWorkouts(next);
  }, []);

  const sessionsByExercise = useMemo(() => {
    const map = new Map<string, ExerciseSession[]>();
    for (const w of workouts) {
      for (const ex of w.exercises) {
        const sets = ex.sets.filter(isLogged);
        if (!sets.length) continue;
        let bestKg: number | undefined;
        let bestE1rm: number | undefined;
        for (const s of sets) {
          if (s.kg === undefined) continue;
          bestKg = Math.max(bestKg ?? 0, s.kg);
          bestE1rm = Math.max(bestE1rm ?? 0, e1rm(s.kg, s.reps ?? 0));
        }
        const list = map.get(ex.exerciseId) ?? [];
        list.push({
          workoutId: w.id,
          workoutName: w.name,
          exerciseName: ex.name,
          date: w.startedAt,
          sets,
          bestKg,
          bestE1rm,
        });
        map.set(ex.exerciseId, list);
      }
    }
    return map;
  }, [workouts]);

  const historyFor = useCallback(
    (id: string) => sessionsByExercise.get(id) ?? [],
    [sessionsByExercise]
  );
  const lastSetsFor = useCallback(
    (id: string) => sessionsByExercise.get(id)?.[0]?.sets ?? [],
    [sessionsByExercise]
  );
  const lastSetsRef = useRef(lastSetsFor);
  useEffect(() => {
    lastSetsRef.current = lastSetsFor;
  }, [lastSetsFor]);

  // ---- Active workout ---------------------------------------------------

  const commitActive = useCallback((next: Workout | null) => {
    activeRef.current = next;
    setActive(next);
    storage.saveActiveWorkout(next);
  }, []);

  const mutateActive = useCallback(
    (fn: (w: Workout) => Workout) => {
      const cur = activeRef.current;
      if (cur) commitActive(fn(cur));
    },
    [commitActive]
  );

  const mutateExercise = useCallback(
    (exId: string, fn: (e: WorkoutExercise) => WorkoutExercise) =>
      mutateActive((w) => ({
        ...w,
        exercises: w.exercises.map((e) => (e.id === exId ? fn(e) : e)),
      })),
    [mutateActive]
  );

  const startWorkout = useCallback(
    (routine?: Routine) => {
      if (activeRef.current) return false;
      ensureRestAlerts(); // ask for notification permission up front, not mid-set
      commitActive({
        id: makeId(),
        name: routine?.name ?? defaultWorkoutName(),
        startedAt: Date.now(),
        routineId: routine?.id,
        exercises: (routine?.exercises ?? []).map((r) => ({
          id: makeId(),
          exerciseId: r.exerciseId,
          name: r.name,
          restSec: r.restSec,
          sets: emptySets(r.sets),
        })),
      });
      return true;
    },
    [commitActive]
  );

  const renameActive = useCallback(
    (name: string) => mutateActive((w) => ({ ...w, name })),
    [mutateActive]
  );

  const addExercises = useCallback(
    (ids: string[]) =>
      mutateActive((w) => ({
        ...w,
        exercises: [
          ...w.exercises,
          ...ids.map((id) => ({
            id: makeId(),
            exerciseId: id,
            name: exerciseMap.get(id)?.name ?? 'Exercise',
            restSec: restByExerciseRef.current[id] ?? DEFAULT_REST_SEC,
            // Match the number of sets done last time (at least one).
            sets: emptySets(lastSetsRef.current(id).length || 1),
          })),
        ],
      })),
    [mutateActive, exerciseMap]
  );

  const removeExercise = useCallback(
    (exId: string) =>
      mutateActive((w) => ({ ...w, exercises: w.exercises.filter((e) => e.id !== exId) })),
    [mutateActive]
  );

  const moveExercise = useCallback(
    (from: number, to: number) => mutateActive((w) => ({ ...w, exercises: moveItem(w.exercises, from, to) })),
    [mutateActive]
  );

  const rememberRest = useCallback((exerciseId: string, sec: number) => {
    if (restByExerciseRef.current[exerciseId] === sec) return;
    const next = { ...restByExerciseRef.current, [exerciseId]: sec };
    restByExerciseRef.current = next;
    setRestByExercise(next);
    storage.saveExerciseRest(next);
  }, []);

  const restFor = useCallback(
    (exerciseId: string) => restByExercise[exerciseId] ?? DEFAULT_REST_SEC,
    [restByExercise]
  );

  const setExerciseRest = useCallback(
    (exId: string, sec: number) => {
      const ex = activeRef.current?.exercises.find((e) => e.id === exId);
      if (ex) rememberRest(ex.exerciseId, sec);
      mutateExercise(exId, (e) => ({ ...e, restSec: sec }));
    },
    [mutateExercise, rememberRest]
  );

  const addSet = useCallback(
    (exId: string) =>
      mutateExercise(exId, (e) => ({ ...e, sets: [...e.sets, { id: makeId(), done: false }] })),
    [mutateExercise]
  );

  const removeSet = useCallback(
    (exId: string, setId: string) =>
      mutateExercise(exId, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) })),
    [mutateExercise]
  );

  const updateSet = useCallback(
    (exId: string, setId: string, patch: Partial<Omit<WorkoutSet, 'id'>>) =>
      mutateExercise(exId, (e) => ({
        ...e,
        sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
      })),
    [mutateExercise]
  );

  const toggleSetDone = useCallback(
    (exId: string, setId: string): 'done' | 'undone' | 'needs-reps' => {
      const ex = activeRef.current?.exercises.find((e) => e.id === exId);
      const index = ex?.sets.findIndex((s) => s.id === setId) ?? -1;
      if (!ex || index < 0) return 'undone';
      const set = ex.sets[index];
      if (set.done) {
        updateSet(exId, setId, { done: false });
        return 'undone';
      }
      const hint = suggestSet(ex.sets, index, lastSetsRef.current(ex.exerciseId));
      const reps = set.reps ?? hint?.reps;
      if (!reps) return 'needs-reps';
      const kg = set.kg ?? hint?.kg;
      updateSet(exId, setId, { done: true, reps, kg });
      startRest(ex.restSec);
      return 'done';
    },
    [updateSet, startRest]
  );

  const finishWorkout = useCallback(async () => {
    const cur = activeRef.current;
    if (!cur) return null;
    const exercisesDone = cur.exercises
      .map((e) => ({ ...e, sets: e.sets.filter(isLogged) }))
      .filter((e) => e.sets.length > 0);
    if (!exercisesDone.length) return null;
    const finished: Workout = { ...cur, endedAt: Date.now(), exercises: exercisesDone };
    const next = [finished, ...workoutsRef.current];
    workoutsRef.current = next;
    setWorkouts(next);
    await storage.saveWorkouts(next);
    commitActive(null);
    setRestTimer(null);
    return finished;
  }, [commitActive, setRestTimer]);

  const discardWorkout = useCallback(() => {
    commitActive(null);
    setRestTimer(null);
  }, [commitActive, setRestTimer]);

  const reload = useCallback(async () => {
    setRoutineDraft(null);
    setRestTimer(null);
    applyAll(await fetchAll());
  }, [applyAll, setRestTimer]);

  const value = useMemo<WorkoutData>(
    () => ({
      ready,
      reload,
      exercises,
      getExercise,
      customExercises,
      addCustomExercise,
      routines,
      saveRoutine,
      deleteRoutine,
      routineDraft,
      setRoutineDraft,
      workouts,
      deleteWorkout,
      historyFor,
      lastSetsFor,
      active,
      startWorkout,
      renameActive,
      addExercises,
      removeExercise,
      moveExercise,
      setExerciseRest,
      restFor,
      rememberRest,
      addSet,
      removeSet,
      updateSet,
      toggleSetDone,
      finishWorkout,
      discardWorkout,
      rest,
      startRest,
      adjustRest,
      skipRest,
    }),
    [
      ready,
      reload,
      exercises,
      getExercise,
      customExercises,
      addCustomExercise,
      routines,
      saveRoutine,
      deleteRoutine,
      routineDraft,
      workouts,
      deleteWorkout,
      historyFor,
      lastSetsFor,
      active,
      startWorkout,
      renameActive,
      addExercises,
      removeExercise,
      moveExercise,
      setExerciseRest,
      restFor,
      rememberRest,
      addSet,
      removeSet,
      updateSet,
      toggleSetDone,
      finishWorkout,
      discardWorkout,
      rest,
      startRest,
      adjustRest,
      skipRest,
    ]
  );

  return (
    <WorkoutContext.Provider value={value}>
      {children}
      {active && <KeepAwake />}
      <RestTicker rest={rest} onFinished={restFinished} />
    </WorkoutContext.Provider>
  );
}

export function useWorkout(): WorkoutData {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used inside WorkoutProvider');
  return ctx;
}
