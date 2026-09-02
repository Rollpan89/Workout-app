import type { MuscleGroup } from './exercise';

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
}

/**
 * User's daily-form check-in. Feeds the adaptive intensity suggestion.
 */
export type ReadinessLevel = 'low' | 'normal' | 'high';
