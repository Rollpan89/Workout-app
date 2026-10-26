import type { MuscleGroup } from './exercise';

/**
 * One finished set, kept so the next session can speak the weight and apply
 * progressive overload where it fits the lift. Absent on older logs.
 */
export interface LoggedSet {
  readonly exerciseId: string;
  readonly reps: number;
  readonly seconds: number;
  readonly weightKg?: number;
  /** Reps the prescription asked for, when the set was rep-based. */
  readonly targetReps?: number;
  readonly feltHeavy?: boolean;
}

/**
 * The persisted record of a completed (or aborted) workout session.
 * Produced by the metrics engine when a session ends.
 */
export interface SessionLog {
  readonly id: string;
  readonly workoutId: string;
  readonly startedAt: string; // ISO-8601
  readonly endedAt: string; // ISO-8601
  readonly durationSeconds: number;
  /** Seconds spent actively working (excludes rest and pauses). */
  readonly workSeconds: number;
  readonly completed: boolean;
  /** Mean intensity over the session (1.0 = as prescribed). */
  readonly averageIntensity: number;
  readonly totalReps: number;
  readonly totalSets: number;
  readonly estimatedCalories: number;
  /** Relative load per muscle group, normalised so the max group is 1. */
  readonly muscleImpact: Readonly<Partial<Record<MuscleGroup, number>>>;
  /** Per-set log. Missing on older sessions — those still open and compare. */
  readonly sets?: readonly LoggedSet[];
}

/**
 * User's daily-form check-in. Feeds the adaptive intensity suggestion.
 */
export type ReadinessLevel = 'low' | 'normal' | 'high';
