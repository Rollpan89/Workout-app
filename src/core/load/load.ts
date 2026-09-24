import {
  ALL_MUSCLE_GROUPS,
  type Equipment,
  type ExerciseCategory,
  type MuscleGroup,
  type MuscleLoad,
} from '../domain/exercise';
import type { LoggedSet, SessionLog } from '../domain/session';
import type { Workout } from '../domain/workout';

/** Olympic bar used for the spoken plate callout. Not a setting — gyms here load a 20 kg bar. */
export const BAR_KG = 20;
/** Manual stepper. Not the progression rule — that depends on the lift. */
export const LOAD_STEP_KG = 2.5;
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

/**
 * How a movement may earn more load.
 * - compound: a base lift. One clean session earns the smallest practical jump.
 * - isolation: a small muscle. The same jump every session is too much, so it
 *   has to be clean twice, and the step is smaller.
 * - none: kilos are not the progression (cardio, mobility, unloaded holds).
 */
export type LoadRole = 'compound' | 'isolation' | 'none';

/** Multi-joint base lifts. A plate jump is a small share of the load. */
const COMPOUND_IDS = new Set([
  'squat',
  'lunge',
  'goblet-squat',
  'romanian-deadlift',
  'push-up',
  'shoulder-press',
  'bent-over-row',
  'pull-up',
  'barbell-squat',
  'bench-press',
  'incline-bench-press',
  'decline-bench-press',
  'close-grip-bench-press',
  'overhead-press',
  'deadlift',
  'barbell-row',
  'barbell-hip-thrust',
  'dumbbell-bench-press',
  'incline-dumbbell-press',
  'one-arm-dumbbell-row',
  'dumbbell-step-up',
  'renegade-row',
]);

/** Timed holds. The prescription is seconds, not a heavier implement. */
const NO_LOAD_IDS = new Set(['wall-sit']);

/** Single-joint and small accessories. Load moves slowly, if at all. */
const ISOLATION_IDS = new Set([
  'glute-bridge',
  'calf-raise',
  'bicep-curl',
  'tricep-dip',
  'barbell-shrug',
  'upright-row',
  'barbell-curl',
  'skullcrusher',
  'hyperextension',
  'dumbbell-fly',
  'dumbbell-pullover',
  'dumbbell-lateral-raise',
  'overhead-tricep-extension',
  'turkish-get-up',
]);

const MUSCLE_HIT = 0.25;
const DAY_MS = 86_400_000;

export interface LoggedLoad {
  readonly weightKg: number;
  readonly reps: number;
  /** Every weighted set of that exercise in the session met its rep target. */
  readonly completedAll: boolean;
  /** Any set in that session was marked heavy. */
  readonly feltHeavy: boolean;
  readonly at: string;
  /** Clean sessions in a row at this same weight, ending with the latest. 0 if the latest was not clean. */
  readonly cleanStreak: number;
}

export interface LoadSuggestion {
  readonly todayKg?: number;
  readonly last?: LoggedLoad;
  readonly role: LoadRole;
  /** Earned a load step. `small` means it was an isolation step, not a base lift. */
  readonly increased: boolean;
  readonly small: boolean;
  /** Missed reps or marked heavy — repeat the load. */
  readonly held: boolean;
  /** Clean, but an isolation lift has not earned its step yet. */
  readonly waiting: boolean;
}

/** What the coach says when an exercise is announced. Numbers only — the script owns the words. */
export interface LoadCue {
  readonly todayKg?: number;
  readonly lastKg?: number;
  readonly lastReps?: number;
  readonly plates?: readonly number[];
  readonly emptyBar?: boolean;
  readonly increased?: boolean;
  readonly small?: boolean;
  readonly held?: boolean;
  readonly waiting?: boolean;
}

export interface TodayPick {
  readonly workout: Workout;
  readonly muscle: MuscleGroup;
  readonly daysRested: number;
  /** No usable history yet — the card is a starter, not a recovery read. */
  readonly learning: boolean;
}

export function formatKg(kg: number, locale: 'sv' | 'en' = 'sv'): string {
  const rounded = Math.round(kg * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return locale === 'sv' ? text.replace('.', ',') : text;
}

export function showsLoadControl(equipment: readonly Equipment[]): boolean {
  return equipment.some((item) => item === 'barbell' || item === 'dumbbells' || item === 'kettlebell' || item === 'pullUpBar');
}

/** First step up from nothing lands on an empty bar; everything else moves by 2.5 kg. */
export function stepWeightKg(current: number, delta: 1 | -1, equipment: readonly Equipment[], max = 300): number {
  if (delta > 0 && current <= 0) return equipment.includes('barbell') ? BAR_KG : LOAD_STEP_KG;
  const next = Math.round((current + delta * LOAD_STEP_KG) * 2) / 2;
  return Math.min(max, Math.max(0, next));
}

/**
 * Plates for one side of a 20 kg bar. `[]` is an empty bar.
 * Returns undefined when the load is not a clean plate split — the coach then says the kilos only.
 */
export function platesPerSide(totalKg: number, barKg = BAR_KG): readonly number[] | undefined {
  if (!Number.isFinite(totalKg) || totalKg + 0.001 < barKg) return undefined;
  const perSide = (totalKg - barKg) / 2;
  const steps = Math.round(perSide / 1.25);
  if (Math.abs(perSide - steps * 1.25) > 0.05) return undefined;
  let remaining = Math.round(steps * 1.25 * 100) / 100;
  const plates: number[] = [];
  for (const plate of PLATES_KG) {
    while (remaining + 0.001 >= plate) {
      plates.push(plate);
      remaining = Math.round((remaining - plate) * 100) / 100;
    }
  }
  if (remaining > 0.05) return undefined;
  return plates;
}

export interface LoadProfile {
  readonly id: string;
  readonly category: ExerciseCategory;
  readonly equipment: readonly Equipment[];
  readonly muscles: MuscleLoad;
}

/**
 * Base lift, isolation, or not a load progression. Listed ids win. Anything
 * new falls back to the category so it cannot silently inherit a plate jump.
 */
export function loadRole(exercise: Pick<LoadProfile, 'id' | 'category' | 'muscles'>): LoadRole {
  if (NO_LOAD_IDS.has(exercise.id)) return 'none';
  if (COMPOUND_IDS.has(exercise.id)) return 'compound';
  if (ISOLATION_IDS.has(exercise.id)) return 'isolation';
  if (exercise.category === 'cardio' || exercise.category === 'mobility') return 'none';
  if (exercise.category === 'core') return 'none';
  const big = (['quads', 'hamstrings', 'glutes', 'chest', 'back'] as const).filter(
    (muscle) => (exercise.muscles[muscle] ?? 0) >= 0.5,
  ).length;
  if (big >= 2) return 'compound';
  const arms = Math.max(exercise.muscles.biceps ?? 0, exercise.muscles.triceps ?? 0, exercise.muscles.calves ?? 0);
  if (arms >= 0.8 || ((exercise.muscles.shoulders ?? 0) >= 0.8 && big === 0)) return 'isolation';
  return big === 1 ? 'compound' : 'isolation';
}

/** Smallest practical jump for this lift. 0 when added kilos are not the progression. */
export function loadStepKg(role: LoadRole, equipment: readonly Equipment[]): number {
  if (role === 'none') return 0;
  const bell = equipment.includes('dumbbells') || equipment.includes('kettlebell');
  if (role === 'compound') return equipment.includes('barbell') || !bell ? 2.5 : 2;
  if (equipment.includes('barbell')) return 2.5;
  if (equipment.includes('kettlebell')) return 2;
  return 1;
}

/** Isolation has to be clean twice. A base lift earns its step on the first clean session. */
export function sessionsToEarn(role: LoadRole): number {
  if (role === 'none') return Number.POSITIVE_INFINITY;
  return role === 'compound' ? 1 : 2;
}

/**
 * Progressive overload, only where a heavier implement is the right next step.
 * Missed reps or "heavy" repeats the load. A base lift then takes its small
 * jump. An isolation lift waits for a second clean session, and the jump is
 * smaller. Cardio, mobility and unloaded holds never get a kilo suggestion.
 */
export function nextWeightKg(
  last: LoggedLoad,
  role: LoadRole,
  equipment: readonly Equipment[] = [],
  max = 300,
): number {
  if (last.feltHeavy || !last.completedAll || role === 'none') return last.weightKg;
  if (last.cleanStreak < sessionsToEarn(role)) return last.weightKg;
  const step = loadStepKg(role, equipment);
  if (step <= 0) return last.weightKg;
  return Math.min(max, Math.round((last.weightKg + step) * 2) / 2);
}

interface SessionLoad {
  readonly weightKg: number;
  readonly reps: number;
  readonly completedAll: boolean;
  readonly feltHeavy: boolean;
  readonly at: string;
}

function sessionLoadOf(log: SessionLog, exerciseId: string): SessionLoad | undefined {
  const sets = (log.sets ?? []).filter((set) => set.exerciseId === exerciseId && (set.weightKg ?? 0) > 0);
  if (sets.length === 0) return undefined;
  const last = sets[sets.length - 1]!;
  return {
    weightKg: last.weightKg!,
    reps: last.reps,
    completedAll: sets.every((set) => set.targetReps === undefined || set.reps >= set.targetReps),
    feltHeavy: sets.some((set) => set.feltHeavy === true),
    at: log.endedAt,
  };
}

/** Most recent session that logged a weight for this exercise, plus the clean streak at that weight. */
export function lastLoad(logs: readonly SessionLog[], exerciseId: string): LoggedLoad | undefined {
  const sessions = [...logs]
    .sort((a, b) => (a.endedAt < b.endedAt ? 1 : a.endedAt > b.endedAt ? -1 : 0))
    .map((log) => sessionLoadOf(log, exerciseId))
    .filter((session): session is SessionLoad => session !== undefined);
  const latest = sessions[0];
  if (!latest) return undefined;
  let cleanStreak = 0;
  if (latest.completedAll && !latest.feltHeavy) {
    for (const session of sessions) {
      if (!session.completedAll || session.feltHeavy) break;
      if (Math.abs(session.weightKg - latest.weightKg) > 0.1) break;
      cleanStreak += 1;
    }
  }
  return { ...latest, cleanStreak };
}

export function suggestLoad(
  logs: readonly SessionLog[],
  exerciseId: string,
  plannedKg?: number,
  profile?: LoadProfile,
): LoadSuggestion {
  const role = profile ? loadRole(profile) : 'isolation';
  const equipment = profile?.equipment ?? [];
  const last = lastLoad(logs, exerciseId);
  if (!last) {
    return {
      todayKg: plannedKg && plannedKg > 0 ? plannedKg : undefined,
      role,
      increased: false,
      small: false,
      held: false,
      waiting: false,
    };
  }
  const todayKg = nextWeightKg(last, role, equipment);
  const increased = todayKg > last.weightKg + 0.01;
  const missed = last.feltHeavy || !last.completedAll;
  return {
    todayKg,
    last,
    role,
    increased,
    small: increased && role === 'isolation',
    held: !increased && missed,
    waiting: !increased && !missed && role === 'isolation',
  };
}

/**
 * `overrideKg` is a weight the user set during this session (including 0 = cleared).
 * An override is spoken as-is: no "we increase" until the next session.
 */
export function buildLoadCue(
  suggestion: LoadSuggestion,
  equipment: readonly Equipment[],
  overrideKg?: number,
): LoadCue {
  const hasOverride = overrideKg !== undefined;
  const todayKg = hasOverride ? (overrideKg > 0 ? overrideKg : undefined) : suggestion.todayKg;
  const plates = todayKg && equipment.includes('barbell') ? platesPerSide(todayKg) : undefined;
  return {
    todayKg,
    lastKg: suggestion.last?.weightKg,
    lastReps: suggestion.last?.reps,
    plates,
    emptyBar: plates !== undefined && plates.length === 0,
    increased: hasOverride ? false : suggestion.increased,
    small: hasOverride ? false : suggestion.small,
    held: hasOverride ? false : suggestion.held,
    waiting: hasOverride ? false : suggestion.waiting,
  };
}

function calendarDays(laterMs: number, earlierMs: number): number {
  const later = new Date(laterMs);
  const earlier = new Date(earlierMs);
  const laterDay = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
  const earlierDay = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  return Math.max(0, Math.round((laterDay - earlierDay) / DAY_MS));
}

function isMuscle(value: string): value is MuscleGroup {
  return (ALL_MUSCLE_GROUPS as readonly string[]).includes(value);
}

/**
 * Today's workout from muscles that have actually been trained and then rested.
 * The workout they usually do for that muscle wins, unless they already did it today.
 * With no history the pick is a starter and `learning` is true.
 */
export function recommendToday(
  workouts: readonly Workout[],
  logs: readonly SessionLog[],
  now = Date.now(),
): TodayPick | undefined {
  if (workouts.length === 0) return undefined;
  const useful = logs.filter((log) =>
    Object.values(log.muscleImpact).some((value) => (value ?? 0) >= MUSCLE_HIT),
  );
  if (useful.length === 0) {
    const starter = workouts.find((workout) => workout.id === 'full-body-blast') ?? workouts[0]!;
    return {
      workout: starter,
      muscle: starter.primaryMuscles[0] ?? 'fullBody',
      daysRested: 0,
      learning: true,
    };
  }

  const lastHit = new Map<MuscleGroup, number>();
  const lastWorkoutAt = new Map<string, number>();
  const usualCount = new Map<string, Map<string, number>>();
  for (const log of useful) {
    const at = Date.parse(log.endedAt);
    if (!Number.isFinite(at)) continue;
    const seen = lastWorkoutAt.get(log.workoutId);
    if (seen === undefined || at > seen) lastWorkoutAt.set(log.workoutId, at);
    for (const [key, impact] of Object.entries(log.muscleImpact)) {
      if (!isMuscle(key) || (impact ?? 0) < MUSCLE_HIT) continue;
      const prev = lastHit.get(key);
      if (prev === undefined || at > prev) lastHit.set(key, at);
      const counts = usualCount.get(key) ?? new Map<string, number>();
      counts.set(log.workoutId, (counts.get(log.workoutId) ?? 0) + 1);
      usualCount.set(key, counts);
    }
  }

  let rested: { muscle: MuscleGroup; days: number } | undefined;
  for (const muscle of ALL_MUSCLE_GROUPS) {
    const at = lastHit.get(muscle);
    if (at === undefined) continue;
    const days = calendarDays(now, at);
    if (!rested || days > rested.days) rested = { muscle, days };
  }
  if (!rested) return undefined;

  const usual = favouriteWorkout(usualCount.get(rested.muscle));
  const matching = workouts.filter((workout) => workout.primaryMuscles.includes(rested.muscle));
  const pool = matching.length > 0 ? matching : workouts;
  let best: { workout: Workout; score: number } | undefined;
  for (const workout of pool) {
    let score = 0;
    if (workout.id === usual) score += 8;
    if (workout.primaryMuscles[0] === rested.muscle) score += 4;
    score += Math.max(0, 4 - workout.primaryMuscles.length);
    const doneAt = lastWorkoutAt.get(workout.id);
    if (doneAt !== undefined && calendarDays(now, doneAt) === 0) score -= 30;
    if (!best || score > best.score || (score === best.score && workout.id < best.workout.id)) {
      best = { workout, score };
    }
  }
  if (!best) return undefined;
  return {
    workout: best.workout,
    muscle: rested.muscle,
    daysRested: rested.days,
    learning: false,
  };
}

function favouriteWorkout(counts: Map<string, number> | undefined): string | undefined {
  if (!counts) return undefined;
  let best: string | undefined;
  let n = 0;
  for (const [id, count] of counts) {
    if (count > n || (count === n && best !== undefined && id < best)) {
      best = id;
      n = count;
    }
  }
  return best;
}

/** In-session sets already done for this exercise, so a later block does not jump the weight mid-workout. */
export function sessionLoad(sets: readonly LoggedSet[], exerciseId: string): number | undefined {
  for (let i = sets.length - 1; i >= 0; i -= 1) {
    const set = sets[i]!;
    if (set.exerciseId === exerciseId && (set.weightKg ?? 0) > 0) return set.weightKg;
  }
  return undefined;
}
