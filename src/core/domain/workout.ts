import type { LocalizedString } from './localized';
import type { Equipment, MuscleGroup } from './exercise';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type WorkoutGoal = 'strength' | 'hypertrophy' | 'endurance' | 'fatLoss' | 'mobility';

/**
 * A single unit of work inside a block. Either rep-based (the coach counts
 * reps at a steady cadence) or time-based (the coach counts down seconds).
 */
export type SetPrescription =
  | { readonly kind: 'reps'; readonly reps: number }
  | { readonly kind: 'time'; readonly seconds: number };

export interface WorkoutExercise {
  readonly exerciseId: string;
  readonly sets: number;
  readonly prescription: SetPrescription;
  /** Rest after each set (seconds). Defaults to the block's rest if omitted. */
  readonly restSeconds?: number;
}

/**
 * Blocks are the modular building bricks of a workout. They can be reused
 * across programs (warm-up, finisher, …) and combined in any order.
 */
export interface WorkoutBlock {
  readonly id: string;
  readonly title: LocalizedString;
  readonly kind: 'warmup' | 'main' | 'finisher' | 'cooldown';
  readonly exercises: readonly WorkoutExercise[];
  /** Default rest between sets in this block (seconds). */
  readonly restSeconds: number;
  /** Rest before moving on to the next exercise within the block (seconds). */
  readonly transitionSeconds: number;
  /** How many times the whole block is repeated (circuit-style). */
  readonly rounds?: number;
}

export interface Workout {
  readonly id: string;
  readonly title: LocalizedString;
  readonly tagline: LocalizedString;
  readonly description: LocalizedString;
  readonly goal: WorkoutGoal;
  readonly difficulty: Difficulty;
  readonly equipment: readonly Equipment[];
  readonly primaryMuscles: readonly MuscleGroup[];
  readonly blocks: readonly WorkoutBlock[];
  /** Approximate duration at intensity 1.0 in minutes (display only). */
  readonly estimatedMinutes: number;
  /** Accent used by the UI for this program card. */
  readonly accent: 'red' | 'orange';
}
