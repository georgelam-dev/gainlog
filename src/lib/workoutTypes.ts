/** An exercise from the built-in library or one the user created. */
export type Exercise = {
  /** Dataset id, or `custom:<id>` for user-created exercises */
  id: string;
  name: string;
  /** Primary muscle, e.g. "chest" */
  muscle: string;
  equipment?: string;
  category?: string;
  custom?: true;
  /** How sets are logged; defaults by category/name when absent (see defaultTracking). */
  tracking?: Tracking;
};

/** Reps-based sets (weight × reps) or timed sets (weight × duration, e.g. plank, cardio). */
export type Tracking = 'reps' | 'time';

/** Warm-ups don't count toward PRs; drop and failure sets are tags. */
export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export type WorkoutSet = {
  id: string;
  /** Always stored in kg; undefined for bodyweight sets */
  kg?: number;
  reps?: number;
  /** Duration in seconds, for timed exercises */
  sec?: number;
  /** Absent = normal */
  type?: SetType;
  done: boolean;
};

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  /** Snapshot of the name so history survives library changes */
  name: string;
  /** Rest after each completed set, in seconds. 0 = no rest timer. */
  restSec: number;
  /** Absent = 'reps' */
  tracking?: Tracking;
  /** Adjacent exercises sharing a groupId form a superset (2) or circuit (3+). */
  groupId?: string;
  sets: WorkoutSet[];
};

export type Workout = {
  id: string;
  name: string;
  /** Epoch ms */
  startedAt: number;
  /** Epoch ms; absent while the workout is in progress */
  endedAt?: number;
  routineId?: string;
  exercises: WorkoutExercise[];
};

export type RoutineExercise = {
  exerciseId: string;
  name: string;
  sets: number;
  /** 0 = no rest timer */
  restSec: number;
  tracking?: Tracking;
  groupId?: string;
};

/** A saved template used to start a workout with exercises pre-filled. */
export type Routine = {
  id: string;
  name: string;
  exercises: RoutineExercise[];
};

/** One past session of a single exercise. */
export type ExerciseSession = {
  workoutId: string;
  workoutName: string;
  /** Exercise name as it was logged */
  exerciseName: string;
  date: number;
  sets: WorkoutSet[];
  /** Heaviest completed set, in kg */
  bestKg?: number;
  /** Best estimated one-rep max (Epley), in kg */
  bestE1rm?: number;
  /** Longest timed set, in seconds */
  bestSec?: number;
  tracking: Tracking;
};

/** Running rest timer. */
export type RestTimer = {
  endsAt: number;
  totalSec: number;
};

export const REST_PRESETS = [0, 30, 60, 90, 120, 180, 300] as const;
