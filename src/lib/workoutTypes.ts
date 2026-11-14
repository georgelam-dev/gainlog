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
};

export type WorkoutSet = {
  id: string;
  /** Always stored in kg; undefined for bodyweight sets */
  kg?: number;
  reps?: number;
  done: boolean;
};

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  /** Snapshot of the name so history survives library changes */
  name: string;
  /** Rest after each completed set, in seconds. 0 = no rest timer. */
  restSec: number;
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
};

/** Running rest timer. */
export type RestTimer = {
  endsAt: number;
  totalSec: number;
};

export const REST_PRESETS = [0, 30, 60, 90, 120, 180, 300] as const;
