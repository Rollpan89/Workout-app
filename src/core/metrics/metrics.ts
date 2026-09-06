import type { Exercise, MuscleGroup } from '../domain/exercise';
import type { SessionLog } from '../domain/session';
import type { UserProfile } from '../domain/settings';
import type { SessionPlan, SessionSnapshot } from '../engine/types';
import { createId } from '../utils/id';

export type ExerciseLookup = (id: string) => Exercise | undefined;

/** MET assumed while resting between sets (standing / light activity). */
const REST_MET = 1.8;

/**
 * Calories burned for a given MET, duration and body weight.
 * Standard formula: kcal/min = MET × 3.5 × kg / 200.
 */
export function caloriesFor(met: number, seconds: number, bodyweightKg: number): number {
  if (seconds <= 0 || met <= 0 || bodyweightKg <= 0) return 0;
  return (met * 3.5 * bodyweightKg) / 200 * (seconds / 60);
}

/**
 * Intensity nudges the metabolic cost: higher intensity means shorter rest
 * and more volume, so the effective MET climbs somewhat.
 */
export function intensityMetMultiplier(intensity: number): number {
  return 0.7 + 0.3 * intensity;
}

export interface SessionMetrics {
  readonly estimatedCalories: number;
  readonly muscleImpact: Readonly<Partial<Record<MuscleGroup, number>>>;
  readonly totalReps: number;
  readonly totalSets: number;
  readonly averageIntensity: number;
}

/**
 * Compute calories and muscle impact from the engine's final snapshot.
 * Pure function – no I/O – so it can run in the background right after the
 * session finishes and be unit-tested in isolation.
 */
export function computeSessionMetrics(
  snapshot: SessionSnapshot,
  profile: UserProfile,
  lookup: ExerciseLookup,
): SessionMetrics {
  const { stats } = snapshot;
  let calories = 0;
  const rawImpact: Partial<Record<MuscleGroup, number>> = {};
  let totalReps = 0;

  for (const record of stats.completedSets) {
    const exercise = lookup(record.exerciseId);
    if (!exercise) continue;
    const met = exercise.met * intensityMetMultiplier(record.intensity);
    calories += caloriesFor(met, record.seconds, profile.bodyweightKg);
    totalReps += record.reps;

    // Volume: reps for rep-based sets, seconds/secondsPerRep for time-based
    const volume = record.reps > 0 ? record.reps : record.seconds / exercise.secondsPerRep;
    for (const [group, load] of Object.entries(exercise.muscles) as [MuscleGroup, number][]) {
      rawImpact[group] = (rawImpact[group] ?? 0) + volume * load * record.intensity;
    }
  }

  calories += caloriesFor(REST_MET, stats.restSeconds, profile.bodyweightKg);

  // Normalise so the hardest-hit group is 1.0 – easy to render as bars
  const max = Math.max(0, ...Object.values(rawImpact).filter((v): v is number => v !== undefined));
  const muscleImpact: Partial<Record<MuscleGroup, number>> = {};
  if (max > 0) {
    for (const [group, value] of Object.entries(rawImpact) as [MuscleGroup, number][]) {
      muscleImpact[group] = Math.round((value / max) * 100) / 100;
    }
  }

  const trackedSeconds = stats.workSeconds + stats.restSeconds;
  const averageIntensity =
    trackedSeconds > 0
      ? Math.round((stats.intensitySecondsSum / trackedSeconds) * 100) / 100
      : snapshot.intensity;

  return {
    estimatedCalories: Math.round(calories),
    muscleImpact,
    totalReps,
    totalSets: stats.completedSets.length,
    averageIntensity,
  };
}

export function buildSessionLog(
  plan: SessionPlan,
  snapshot: SessionSnapshot,
  completed: boolean,
  profile: UserProfile,
  lookup: ExerciseLookup,
  now: number = Date.now(),
): SessionLog {
  const metrics = computeSessionMetrics(snapshot, profile, lookup);
  const startedAt = snapshot.startedAt ?? now;
  return {
    id: createId('session'),
    workoutId: plan.workout.id,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(now).toISOString(),
    durationSeconds: Math.round(snapshot.sessionElapsedSeconds),
    workSeconds: Math.round(snapshot.stats.workSeconds),
    completed,
    ...metrics,
  };
}

/** Aggregate helpers for the history screen. */
export interface HistorySummary {
  readonly sessions: number;
  readonly totalCalories: number;
  readonly totalMinutes: number;
  readonly totalReps: number;
  readonly muscleImpact: Readonly<Partial<Record<MuscleGroup, number>>>;
  /** Consecutive days (ending today or yesterday) with at least one session. */
  readonly streakDays: number;
}

export function summarizeHistory(logs: readonly SessionLog[], now: number = Date.now()): HistorySummary {
  const impact: Partial<Record<MuscleGroup, number>> = {};
  let totalCalories = 0;
  let totalSeconds = 0;
  let totalReps = 0;

  for (const log of logs) {
    totalCalories += log.estimatedCalories;
    totalSeconds += log.durationSeconds;
    totalReps += log.totalReps;
    for (const [group, value] of Object.entries(log.muscleImpact) as [MuscleGroup, number][]) {
      impact[group] = (impact[group] ?? 0) + value;
    }
  }

  const max = Math.max(0, ...Object.values(impact).filter((v): v is number => v !== undefined));
  const muscleImpact: Partial<Record<MuscleGroup, number>> = {};
  if (max > 0) {
    for (const [group, value] of Object.entries(impact) as [MuscleGroup, number][]) {
      muscleImpact[group] = Math.round((value / max) * 100) / 100;
    }
  }

  return {
    sessions: logs.length,
    totalCalories,
    totalMinutes: Math.round(totalSeconds / 60),
    totalReps,
    muscleImpact,
    streakDays: computeStreak(logs, now),
  };
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function computeStreak(logs: readonly SessionLog[], now: number = Date.now()): number {
  if (logs.length === 0) return 0;
  const days = new Set(logs.map((l) => dayKey(new Date(l.endedAt).getTime())));
  const DAY = 24 * 60 * 60 * 1000;
  let cursor = now;
  // Allow the streak to be "alive" if the last session was yesterday
  if (!days.has(dayKey(cursor))) {
    cursor -= DAY;
    if (!days.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor -= DAY;
  }
  return streak;
}

/* ------------------------------------------------------------------------ */
/* Comparison with the previous session of the same workout                  */
/* ------------------------------------------------------------------------ */

export interface LogComparison {
  /** The log compared against (most recent earlier *completed* run of the same workout). */
  readonly previous: SessionLog;
  /** Deltas: positive = more than last time. */
  readonly durationSeconds: number;
  readonly totalReps: number;
  readonly estimatedCalories: number;
  /** Difference in average intensity (e.g. +0.25). */
  readonly averageIntensity: number;
  /** Number of earlier completed runs of this workout. */
  readonly runs: number;
}

/**
 * "Jämfört med förra gången": find the most recent completed log of the same
 * workout that ended before `log` and return the deltas. Undefined for the
 * first run of a workout.
 */
export function compareWithPrevious(log: SessionLog, history: readonly SessionLog[]): LogComparison | undefined {
  const earlier = history
    .filter((l) => l.id !== log.id && l.workoutId === log.workoutId && l.completed && l.endedAt < log.endedAt)
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  const previous = earlier[0];
  if (!previous) return undefined;
  return {
    previous,
    durationSeconds: log.durationSeconds - previous.durationSeconds,
    totalReps: log.totalReps - previous.totalReps,
    estimatedCalories: log.estimatedCalories - previous.estimatedCalories,
    averageIntensity: Math.round((log.averageIntensity - previous.averageIntensity) * 100) / 100,
    runs: earlier.length,
  };
}

/* ------------------------------------------------------------------------ */
/* Calorie uncertainty                                                        */
/* ------------------------------------------------------------------------ */

/**
 * MET-based estimates without heart-rate data are honest to about ±20 %
 * (individual efficiency, real intensity, EPOC). Rather than print a
 * falsely precise "237 kcal" the UI shows a rounded range.
 */
export const CALORIE_UNCERTAINTY = 0.2;

export interface CalorieRange {
  readonly low: number;
  readonly high: number;
  /** The point estimate the range was derived from. */
  readonly mid: number;
}

export function calorieRange(kcal: number, uncertainty: number = CALORIE_UNCERTAINTY): CalorieRange {
  const mid = Math.max(0, Math.round(kcal));
  if (mid === 0) return { low: 0, high: 0, mid: 0 };
  const step = mid >= 100 ? 10 : 5;
  const low = Math.max(0, Math.floor((mid * (1 - uncertainty)) / step) * step);
  const high = Math.ceil((mid * (1 + uncertainty)) / step) * step;
  return { low, high, mid };
}

/** "180–260" (en dash), or "0" for nothing burned. */
export function formatCalorieRange(kcal: number): string {
  const r = calorieRange(kcal);
  if (r.high === 0) return '0';
  return `${r.low}–${r.high}`;
}
