import type { Exercise, MuscleGroup } from './exercise';
import { lz, type LocalizedString } from './localized';
import type { Difficulty, SetPrescription, Workout, WorkoutAccent, WorkoutBlock, WorkoutExercise, WorkoutGoal } from './workout';
import { WORKOUT_ACCENTS } from './workout';

/**
 * Custom workouts
 * ---------------
 * A user-built workout is a *simplified* editing model (`CustomWorkoutDraft`)
 * that compiles down to the same `Workout` shape the engine, planner and
 * metrics already understand. The draft is three ordered lists in one array
 * (warm-up, training, stretch) so rounds can repeat only the training.
 */

/** Where an exercise sits. Absent means the training block (older drafts). */
export type DraftSection = 'warmup' | 'main' | 'stretch';

export const DRAFT_SECTIONS: readonly DraftSection[] = ['warmup', 'main', 'stretch'] as const;

export interface DraftExercise {
  readonly exerciseId: string;
  readonly sets: number;
  readonly prescription: SetPrescription;
  /** Rest after each set in seconds. */
  readonly restSeconds: number;
  /** Planned external load in kilograms. Omitted (or 0) means no weight. */
  readonly weightKg?: number;
  /**
   * Warm-up and stretch run once. Training (`main`, or omitted) is what
   * `rounds` repeats. Omitted on older drafts and on training rows so a
   * share code without the field still means "training".
   */
  readonly section?: DraftSection;
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
  /**
   * Repeat the training section this many times. Warm-up and stretch always
   * run once. Optional for older drafts; treated as 1 when absent.
   */
  readonly rounds?: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Id of the built-in workout this was copied from, if any. */
  readonly sourceId?: string;
}

/**
 * A built-in workout that the user (in admin mode) has replaced with their
 * own version. The draft carries the *built-in id* so the compiled workout
 * takes its place everywhere the app looks a workout up by id.
 */
export interface WorkoutOverride {
  readonly workoutId: string;
  readonly draft: CustomWorkoutDraft;
  /** ISO timestamp for the last edit. */
  readonly updatedAt: string;
}

export const DRAFT_LIMITS = {
  nameMax: 40,
  sets: { min: 1, max: 10 },
  reps: { min: 1, max: 100 },
  seconds: { min: 5, max: 600 },
  rest: { min: 0, max: 300 },
  transition: { min: 0, max: 120 },
  exercises: { min: 1, max: 30 },
  rounds: { min: 1, max: 10 },
  weight: { min: 0, max: 300 },
} as const;

/** Effective number of rounds of a draft (1 when unset or invalid). */
export function draftRounds(draft: Pick<CustomWorkoutDraft, 'rounds'>): number {
  const r = draft.rounds ?? 1;
  if (!Number.isFinite(r)) return 1;
  return Math.min(DRAFT_LIMITS.rounds.max, Math.max(DRAFT_LIMITS.rounds.min, Math.round(r)));
}

/** Training when the field is missing – that is how drafts used to be stored. */
export function exerciseSection(item: Pick<DraftExercise, 'section'>): DraftSection {
  return item.section === 'warmup' || item.section === 'stretch' ? item.section : 'main';
}

export function exercisesInSection(
  exercises: readonly DraftExercise[],
  section: DraftSection,
): readonly DraftExercise[] {
  return exercises.filter((item) => exerciseSection(item) === section);
}

/** Drop the section field for training so older readers still treat the row as main. */
export function withSection(item: DraftExercise, section: DraftSection): DraftExercise {
  if (section === 'main') {
    const { section: _ignored, ...rest } = item;
    return rest;
  }
  return { ...item, section };
}

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

function sectionForKind(kind: WorkoutBlock['kind']): DraftSection {
  if (kind === 'warmup') return 'warmup';
  if (kind === 'cooldown' || kind === 'stretch') return 'stretch';
  return 'main';
}

function toDraftExercise(block: WorkoutBlock, we: WorkoutBlock['exercises'][number], section: DraftSection): DraftExercise {
  const row: DraftExercise = {
    exerciseId: we.exerciseId,
    sets: we.sets,
    prescription: we.prescription,
    restSeconds: we.restSeconds ?? block.restSeconds,
    ...(we.weightKg && we.weightKg > 0 ? { weightKg: we.weightKg } : {}),
  };
  return withSection(row, section);
}

/**
 * Turn any workout into an editable draft.
 *
 * Warm-up and stretch stay their own sections and are never repeated by
 * rounds. Training keeps a single rounds value when every training block
 * agrees; mixed circuits (a 3-round block plus a finisher) are expanded so
 * the amount of work stays truthful.
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
  const mainBlocks = source.blocks.filter((block) => sectionForKind(block.kind) === 'main');
  const mainRoundValues = mainBlocks.map((block) => Math.max(1, block.rounds ?? 1));
  const uniformRounds =
    mainRoundValues.length > 0 && mainRoundValues.every((rounds) => rounds === mainRoundValues[0]);
  const rounds = uniformRounds ? (mainRoundValues[0] ?? 1) : 1;

  for (const block of source.blocks) {
    const section = sectionForKind(block.kind);
    if (section === 'main') transition = block.transitionSeconds;
    const expand = section === 'main' && uniformRounds ? 1 : Math.max(1, block.rounds ?? 1);
    for (let r = 0; r < expand; r += 1) {
      for (const we of block.exercises) exercises.push(toDraftExercise(block, we, section));
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
    ...(rounds > 1 ? { rounds } : {}),
    createdAt: now,
    updatedAt: now,
    sourceId: source.id,
  };
}

function toWorkoutExercise(e: DraftExercise): WorkoutExercise {
  return {
    exerciseId: e.exerciseId,
    sets: e.sets,
    prescription: e.prescription,
    restSeconds: e.restSeconds,
    ...(e.weightKg && e.weightKg > 0 ? { weightKg: e.weightKg } : {}),
  };
}

/** Compile a draft into a runnable `Workout`. Warm-up and stretch run once; rounds repeat only training. */
export function compileDraft(draft: CustomWorkoutDraft, lookup: (id: string) => Exercise | undefined): Workout {
  const known = draft.exercises.filter((e) => lookup(e.exerciseId) !== undefined);
  const warmup = known.filter((e) => exerciseSection(e) === 'warmup');
  const training = known.filter((e) => exerciseSection(e) === 'main');
  const stretch = known.filter((e) => exerciseSection(e) === 'stretch');
  const rounds = draftRounds(draft);
  const hasBookends = warmup.length > 0 || stretch.length > 0;

  const blocks: WorkoutBlock[] = [];
  if (warmup.length > 0) {
    blocks.push({
      id: `${draft.id}-warmup`,
      title: lz('Uppvärmning', 'Warm-up'),
      kind: 'warmup',
      exercises: warmup.map(toWorkoutExercise),
      restSeconds: 0,
      transitionSeconds: draft.transitionSeconds,
    });
  }
  // A draft with no known exercises still compiles to one empty main block.
  if (training.length > 0 || known.length === 0) {
    blocks.push({
      id: `${draft.id}-main`,
      title: hasBookends
        ? lz('Träning', 'Training')
        : rounds > 1
          ? lz('Cirkel', 'Circuit')
          : lz('Ditt pass', 'Your workout'),
      kind: 'main',
      exercises: training.map(toWorkoutExercise),
      restSeconds: 60,
      transitionSeconds: draft.transitionSeconds,
      ...(rounds > 1 ? { rounds } : {}),
    });
  }
  if (stretch.length > 0) {
    blocks.push({
      id: `${draft.id}-stretch`,
      title: lz('Stretch', 'Stretch'),
      kind: 'stretch',
      exercises: stretch.map(toWorkoutExercise),
      restSeconds: 0,
      transitionSeconds: draft.transitionSeconds,
    });
  }

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
    blocks,
    estimatedMinutes: estimateDraftMinutes(draft, lookup),
    accent: draft.accent,
    custom: true,
    createdAt: draft.createdAt,
  };
}

/** Work inside one pass of a section, without the rest that follows the last exercise. */
function sectionWorkSeconds(
  exercises: readonly DraftExercise[],
  transitionSeconds: number,
  lookup: (id: string) => Exercise | undefined,
): number {
  let seconds = 0;
  const known = exercises.filter((e) => lookup(e.exerciseId) !== undefined);
  known.forEach((e, i) => {
    const ex = lookup(e.exerciseId);
    if (!ex) return;
    const work = e.prescription.kind === 'reps' ? e.prescription.reps * ex.secondsPerRep : e.prescription.seconds;
    seconds += e.sets * (work + 5); // 5 s announce/get-ready per set
    seconds += Math.max(0, e.sets - 1) * e.restSeconds;
    if (i < known.length - 1) seconds += transitionSeconds;
  });
  return seconds;
}

/**
 * Rough duration at intensity 1.0 (mirrors the planner).
 * Rounds multiply only the training section. A section that is followed by
 * another adds one transition per round; the last section only adds the
 * transitions between its own rounds.
 */
export function estimateDraftMinutes(draft: CustomWorkoutDraft, lookup: (id: string) => Exercise | undefined): number {
  const rounds = draftRounds(draft);
  const groups = DRAFT_SECTIONS.map((section) => ({
    section,
    rounds: section === 'main' ? rounds : 1,
    exercises: draft.exercises.filter((e) => exerciseSection(e) === section),
  })).filter((group) => group.exercises.some((e) => lookup(e.exerciseId) !== undefined));

  let seconds = 0;
  groups.forEach((group, i) => {
    const work = sectionWorkSeconds(group.exercises, draft.transitionSeconds, lookup);
    const followed = i < groups.length - 1;
    const trailing = (followed ? group.rounds : Math.max(0, group.rounds - 1)) * draft.transitionSeconds;
    seconds += work * group.rounds + trailing;
  });
  return Math.max(1, Math.round(seconds / 60));
}
