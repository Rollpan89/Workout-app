import type { Exercise, MuscleGroup } from './exercise';
import { lz, type LocalizedString } from './localized';
import type { Difficulty, SetPrescription, Workout, WorkoutAccent, WorkoutBlock, WorkoutExercise, WorkoutGoal } from './workout';
import { WORKOUT_ACCENTS } from './workout';

/**
 * Custom workouts
 * ---------------
 * A user-built workout is a *simplified* editing model (`CustomWorkoutDraft`)
 * that compiles down to the same `Workout` shape the engine, planner and
 * metrics already understand. Keeping the draft flat (a single ordered list
 * of exercises) makes the builder UI easy while preserving full
 * compatibility with built-in programs.
 */

export interface DraftExercise {
  readonly exerciseId: string;
  readonly sets: number;
  readonly prescription: SetPrescription;
  /** Rest after each set in seconds. */
  readonly restSeconds: number;
}

export interface CustomWorkoutDraft {
  readonly id: string;
  readonly name: string;
  readonly goal: WorkoutGoal;
  readonly difficulty: Difficulty;
  readonly accent: WorkoutAccent;
  readonly exercises: readonly DraftExercise[];
  /** Rest between exercises (transition) in seconds. */
  readonly transitionSeconds: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Id of the built-in workout this was copied from, if any. */
  readonly sourceId?: string;
}

export const DRAFT_LIMITS = {
  nameMax: 40,
  sets: { min: 1, max: 10 },
  reps: { min: 1, max: 100 },
  seconds: { min: 5, max: 600 },
  rest: { min: 0, max: 300 },
  transition: { min: 0, max: 120 },
  exercises: { min: 1, max: 30 },
} as const;

export type DraftValidationError = 'nameRequired' | 'noExercises' | 'tooManyExercises';

export function validateDraft(draft: CustomWorkoutDraft): readonly DraftValidationError[] {
  const errors: DraftValidationError[] = [];
  if (draft.name.trim().length === 0) errors.push('nameRequired');
  if (draft.exercises.length < DRAFT_LIMITS.exercises.min) errors.push('noExercises');
  if (draft.exercises.length > DRAFT_LIMITS.exercises.max) errors.push('tooManyExercises');
  return errors;
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Rotate through the palette so consecutive custom workouts get different colours. */
export function nextAccent(existing: readonly { accent: WorkoutAccent }[]): WorkoutAccent {
  const counts = new Map<WorkoutAccent, number>(WORKOUT_ACCENTS.map((a) => [a, 0]));
  for (const w of existing) counts.set(w.accent, (counts.get(w.accent) ?? 0) + 1);
  let best: WorkoutAccent = WORKOUT_ACCENTS[0] ?? 'red';
  let bestCount = Infinity;
  for (const a of WORKOUT_ACCENTS) {
    const c = counts.get(a) ?? 0;
    if (c < bestCount) {
      best = a;
      bestCount = c;
    }
  }
  return best;
}

export function createEmptyDraft(id: string, accent: WorkoutAccent, now: string): CustomWorkoutDraft {
  return {
    id,
    name: '',
    goal: 'strength',
    difficulty: 'intermediate',
    accent,
    exercises: [],
    transitionSeconds: 20,
    createdAt: now,
    updatedAt: now,
  };
}

/** Sensible defaults for a freshly added exercise, based on its category. */
export function defaultDraftExercise(exercise: Exercise): DraftExercise {
  switch (exercise.category) {
    case 'cardio':
      return { exerciseId: exercise.id, sets: 3, prescription: { kind: 'time', seconds: 30 }, restSeconds: 20 };
    case 'mobility':
      return { exerciseId: exercise.id, sets: 1, prescription: { kind: 'time', seconds: 40 }, restSeconds: 0 };
    case 'core':
      return exercise.secondsPerRep <= 1
        ? { exerciseId: exercise.id, sets: 3, prescription: { kind: 'time', seconds: 30 }, restSeconds: 30 }
        : { exerciseId: exercise.id, sets: 3, prescription: { kind: 'reps', reps: 15 }, restSeconds: 30 };
    case 'strength':
    default:
      return { exerciseId: exercise.id, sets: 3, prescription: { kind: 'reps', reps: 10 }, restSeconds: 60 };
  }
}

/**
 * Flatten a built-in (or custom) workout into a draft so the user can
 * "copy & customise" it. Rounds are expanded into repeated exercises so the
 * simple editor can represent circuits without a rounds concept.
 */
export function draftFromWorkout(
  source: Workout,
  id: string,
  name: string,
  accent: WorkoutAccent,
  now: string,
): CustomWorkoutDraft {
  const exercises: DraftExercise[] = [];
  let transition = 20;
  for (const block of source.blocks) {
    const rounds = Math.max(1, block.rounds ?? 1);
    transition = block.kind === 'main' ? block.transitionSeconds : transition;
    for (let r = 0; r < rounds; r += 1) {
      for (const we of block.exercises) {
        exercises.push({
          exerciseId: we.exerciseId,
          sets: we.sets,
          prescription: we.prescription,
          restSeconds: we.restSeconds ?? block.restSeconds,
        });
      }
    }
  }
  return {
    id,
    name,
    goal: source.goal,
    difficulty: source.difficulty,
    accent,
    exercises,
    transitionSeconds: transition,
    createdAt: now,
    updatedAt: now,
    sourceId: source.id,
  };
}

/** Compile a draft into a runnable `Workout`. */
export function compileDraft(draft: CustomWorkoutDraft, lookup: (id: string) => Exercise | undefined): Workout {
  const known = draft.exercises.filter((e) => lookup(e.exerciseId) !== undefined);
  const exercises: WorkoutExercise[] = known.map((e) => ({
    exerciseId: e.exerciseId,
    sets: e.sets,
    prescription: e.prescription,
    restSeconds: e.restSeconds,
  }));

  const block: WorkoutBlock = {
    id: `${draft.id}-main`,
    title: lz('Ditt pass', 'Your workout'),
    kind: 'main',
    exercises,
    restSeconds: 60,
    transitionSeconds: draft.transitionSeconds,
  };

  const equipment = new Set<Exercise['equipment'][number]>();
  const muscleLoad = new Map<MuscleGroup, number>();
  for (const e of known) {
    const ex = lookup(e.exerciseId);
    if (!ex) continue;
    for (const eq of ex.equipment) equipment.add(eq);
    for (const [muscle, load] of Object.entries(ex.muscles) as [MuscleGroup, number][]) {
      muscleLoad.set(muscle, (muscleLoad.get(muscle) ?? 0) + load * e.sets);
    }
  }
  const primaryMuscles = [...muscleLoad.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m]) => m);

  const realEquipment = [...equipment].filter((e) => e !== 'none');
  const title: LocalizedString = lz(draft.name, draft.name);
  return {
    id: draft.id,
    title,
    tagline: lz(`${known.length} övningar`, `${known.length} exercises`),
    description: draft.sourceId ? lz('Baserat på ett färdigt pass.', 'Based on a built-in program.') : lz('Ditt eget pass.', 'Your own workout.'),
    goal: draft.goal,
    difficulty: draft.difficulty,
    equipment: realEquipment.length === 0 ? ['none'] : realEquipment,
    primaryMuscles,
    blocks: [block],
    estimatedMinutes: estimateDraftMinutes(draft, lookup),
    accent: draft.accent,
    custom: true,
    createdAt: draft.createdAt,
  };
}

/** Rough duration at intensity 1.0 (mirrors the planner's estimate). */
export function estimateDraftMinutes(draft: CustomWorkoutDraft, lookup: (id: string) => Exercise | undefined): number {
  let seconds = 0;
  draft.exercises.forEach((e, i) => {
    const ex = lookup(e.exerciseId);
    if (!ex) return;
    const work = e.prescription.kind === 'reps' ? e.prescription.reps * ex.secondsPerRep : e.prescription.seconds;
    seconds += e.sets * (work + 5); // 5 s announce/get-ready per set
    seconds += Math.max(0, e.sets - 1) * e.restSeconds;
    if (i < draft.exercises.length - 1) seconds += draft.transitionSeconds;
  });
  return Math.max(1, Math.round(seconds / 60));
}
