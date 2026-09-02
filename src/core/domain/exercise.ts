import type { LocalizedString } from './localized';

/**
 * Muscle groups tracked by the metrics engine. Deliberately coarse – fine
 * enough for a "muscle impact" summary, coarse enough to stay maintainable.
 */
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'fullBody';

export const ALL_MUSCLE_GROUPS: readonly MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'core',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'fullBody',
] as const;

export type ExerciseCategory = 'strength' | 'cardio' | 'mobility' | 'core';

export type Equipment = 'none' | 'dumbbells' | 'barbell' | 'kettlebell' | 'bench' | 'pullUpBar';

/**
 * Relative load per muscle group in the range 0..1. The metrics engine
 * multiplies these by work volume to produce a muscle-impact profile.
 */
export type MuscleLoad = Partial<Readonly<Record<MuscleGroup, number>>>;

export interface Exercise {
  readonly id: string;
  readonly name: LocalizedString;
  /** Short coaching cue spoken before the first rep, e.g. "Håll ryggen rak". */
  readonly cue?: LocalizedString;
  readonly category: ExerciseCategory;
  readonly equipment: readonly Equipment[];
  readonly muscles: MuscleLoad;
  /**
   * Metabolic equivalent of task. Used for calorie estimation:
   * kcal/min = MET × 3.5 × bodyweightKg / 200.
   */
  readonly met: number;
  /** Seconds per rep at "normal" tempo. Used as the base cadence for counting. */
  readonly secondsPerRep: number;
}
