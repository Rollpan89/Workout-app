import { clamp, DRAFT_LIMITS, type CustomWorkoutDraft, type DraftExercise } from './customWorkout';
import type { Exercise } from './exercise';
import {
  WORKOUT_ACCENTS,
  type Difficulty,
  type SetPrescription,
  type WorkoutAccent,
  type WorkoutGoal,
} from './workout';

/**
 * Share codes
 * -----------
 * A custom workout is shared as *text*: a short prefix plus a compact JSON
 * body. Text travels through every channel the user already has (SMS,
 * WhatsApp, e-mail, notes) with no backend, no account and no deep links –
 * and it doubles as a copy/paste format when a share sheet is unavailable.
 *
 *     PULSECOACH:WORKOUT:1:{"v":1,"n":"Måndagsben", …}
 *
 * Decoding is deliberately forgiving: the code may arrive surrounded by
 * chatter ("Kolla mitt pass! PULSECOACH:…"), and every number is clamped to
 * `DRAFT_LIMITS` so a hand-edited code can never produce an unrunnable draft.
 * Exercises this installation does not know are dropped and reported, so an
 * old build can still import a newer code.
 */

export const SHARE_CODE_PREFIX = 'PULSECOACH:WORKOUT:1:';
export const SHARE_CODE_VERSION = 1;

export type ShareCodeError =
  'empty' | 'malformed' | 'unsupportedVersion' | 'noName' | 'noExercises';

export interface SharedWorkout {
  readonly name: string;
  readonly goal: WorkoutGoal;
  readonly difficulty: Difficulty;
  readonly accent: WorkoutAccent;
  readonly exercises: readonly DraftExercise[];
  readonly transitionSeconds: number;
  readonly rounds: number;
  /** Exercise ids in the code that this installation does not know (dropped). */
  readonly unknownExerciseIds: readonly string[];
}

export type ShareCodeDecodeResult =
  | { readonly ok: true; readonly workout: SharedWorkout }
  | { readonly ok: false; readonly error: ShareCodeError };

const GOALS: readonly WorkoutGoal[] = [
  'strength',
  'hypertrophy',
  'endurance',
  'fatLoss',
  'mobility',
];
const DIFFICULTIES: readonly Difficulty[] = ['beginner', 'intermediate', 'advanced'];

/* ------------------------------------------------------------------------ */
/* Encoding                                                                   */
/* ------------------------------------------------------------------------ */

interface SharePayloadExercise {
  readonly x: string;
  readonly s: number;
  readonly p: { readonly k: 'reps' | 'time'; readonly n: number };
  readonly r: number;
}

interface SharePayload {
  readonly v: number;
  readonly n: string;
  readonly g: WorkoutGoal;
  readonly d: Difficulty;
  readonly a: WorkoutAccent;
  readonly t: number;
  readonly r: number;
  readonly e: readonly SharePayloadExercise[];
}

/** The transportable body of a draft (no ids, no timestamps). */
export function encodeWorkoutShareCode(draft: CustomWorkoutDraft): string {
  const payload: SharePayload = {
    v: SHARE_CODE_VERSION,
    n: draft.name.trim(),
    g: draft.goal,
    d: draft.difficulty,
    a: draft.accent,
    t: clamp(draft.transitionSeconds, DRAFT_LIMITS.transition.min, DRAFT_LIMITS.transition.max),
    r: draft.rounds ?? 1,
    e: draft.exercises.map((e) => ({
      x: e.exerciseId,
      s: e.sets,
      p:
        e.prescription.kind === 'reps'
          ? { k: 'reps', n: e.prescription.reps }
          : { k: 'time', n: e.prescription.seconds },
      r: e.restSeconds,
    })),
  };
  return `${SHARE_CODE_PREFIX}${JSON.stringify(payload)}`;
}

/** True when the text looks like a workout share code (prefix present). */
export function looksLikeShareCode(text: string): boolean {
  return text.includes(SHARE_CODE_PREFIX) || /^\s*\{\s*"v"\s*:/.test(text);
}

/* ------------------------------------------------------------------------ */
/* Decoding                                                                   */
/* ------------------------------------------------------------------------ */

/**
 * Parse a share code. Unknown exercise ids are dropped (see
 * `unknownExerciseIds`) – the caller decides whether that is worth warning about.
 */
export function decodeWorkoutShareCode(
  text: string,
  lookup: (id: string) => Exercise | undefined,
): ShareCodeDecodeResult {
  const raw = text?.trim() ?? '';
  if (raw.length === 0) return { ok: false, error: 'empty' };

  const json = extractJsonObject(raw);
  if (!json) return { ok: false, error: 'malformed' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'malformed' };
  }
  if (!isRecord(parsed)) return { ok: false, error: 'malformed' };

  const version = typeof parsed.v === 'number' ? parsed.v : SHARE_CODE_VERSION;
  if (version > SHARE_CODE_VERSION) return { ok: false, error: 'unsupportedVersion' };

  const name = typeof parsed.n === 'string' ? parsed.n.trim().slice(0, DRAFT_LIMITS.nameMax) : '';
  if (name.length === 0) return { ok: false, error: 'noName' };

  const rawExercises = Array.isArray(parsed.e) ? parsed.e : [];
  const exercises: DraftExercise[] = [];
  const unknownExerciseIds: string[] = [];
  for (const item of rawExercises.slice(0, DRAFT_LIMITS.exercises.max)) {
    const exercise = readExercise(item, lookup);
    if (!exercise) continue;
    if (exercise.unknown) unknownExerciseIds.push(exercise.id);
    else exercises.push(exercise.draft);
  }
  if (exercises.length < 1) return { ok: false, error: 'noExercises' };

  return {
    ok: true,
    workout: {
      name,
      goal: pick(parsed.g, GOALS, 'strength'),
      difficulty: pick(parsed.d, DIFFICULTIES, 'intermediate'),
      accent: pick(parsed.a, WORKOUT_ACCENTS, 'red'),
      exercises,
      transitionSeconds: clamp(
        numberOr(parsed.t, 20),
        DRAFT_LIMITS.transition.min,
        DRAFT_LIMITS.transition.max,
      ),
      rounds: clamp(numberOr(parsed.r, 1), DRAFT_LIMITS.rounds.min, DRAFT_LIMITS.rounds.max),
      unknownExerciseIds,
    },
  };
}

/** Turn a decoded workout into a fresh, editable draft of this installation. */
export function draftFromSharedWorkout(
  shared: SharedWorkout,
  options: { readonly id: string; readonly accent?: WorkoutAccent; readonly now: string },
): CustomWorkoutDraft {
  return {
    id: options.id,
    name: shared.name,
    goal: shared.goal,
    difficulty: shared.difficulty,
    accent: options.accent ?? shared.accent,
    exercises: shared.exercises,
    transitionSeconds: shared.transitionSeconds,
    ...(shared.rounds > 1 ? { rounds: shared.rounds } : {}),
    createdAt: options.now,
    updatedAt: options.now,
  };
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                    */
/* ------------------------------------------------------------------------ */

/** First balanced `{…}` object in the text (share codes often arrive in a sentence). */
function extractJsonObject(text: string): string | undefined {
  const start = text.indexOf('{');
  if (start < 0) return undefined;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return undefined;
}

function readExercise(
  item: unknown,
  lookup: (id: string) => Exercise | undefined,
): { readonly id: string; readonly unknown: boolean; readonly draft: DraftExercise } | undefined {
  if (!isRecord(item)) return undefined;
  const id = typeof item.x === 'string' ? item.x.trim() : '';
  if (id.length === 0) return undefined;

  const prescription = readPrescription(item.p);
  if (!prescription) return undefined;

  const draft: DraftExercise = {
    exerciseId: id,
    sets: clamp(numberOr(item.s, 3), DRAFT_LIMITS.sets.min, DRAFT_LIMITS.sets.max),
    prescription,
    restSeconds: clamp(numberOr(item.r, 60), DRAFT_LIMITS.rest.min, DRAFT_LIMITS.rest.max),
  };
  return { id, unknown: lookup(id) === undefined, draft };
}

function readPrescription(value: unknown): SetPrescription | undefined {
  if (!isRecord(value)) return undefined;
  const n = numberOr(value.n, NaN);
  if (!Number.isFinite(n)) return undefined;
  if (value.k === 'time' || value.k === 'seconds') {
    return { kind: 'time', seconds: clamp(n, DRAFT_LIMITS.seconds.min, DRAFT_LIMITS.seconds.max) };
  }
  if (value.k === 'reps' || value.k === undefined) {
    return { kind: 'reps', reps: clamp(n, DRAFT_LIMITS.reps.min, DRAFT_LIMITS.reps.max) };
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}
