import { getExercise } from '@/content';
import {
  createEmptyDraft,
  decodeWorkoutShareCode,
  draftFromSharedWorkout,
  encodeWorkoutShareCode,
  looksLikeShareCode,
  SHARE_CODE_PREFIX,
  type CustomWorkoutDraft,
} from '../domain';

const NOW = '2026-09-22T10:00:00.000Z';

function draft(patch: Partial<CustomWorkoutDraft> = {}): CustomWorkoutDraft {
  return {
    ...createEmptyDraft('cw_1', 'red', NOW),
    name: 'Måndagsben',
    exercises: [
      { exerciseId: 'squat', sets: 3, prescription: { kind: 'reps', reps: 10 }, restSeconds: 60 },
      { exerciseId: 'plank', sets: 2, prescription: { kind: 'time', seconds: 40 }, restSeconds: 30 },
    ],
    transitionSeconds: 20,
    ...patch,
  };
}

describe('share codes', () => {
  it('round-trips a draft through encode → decode', () => {
    const code = encodeWorkoutShareCode(draft({ rounds: 2, goal: 'hypertrophy', difficulty: 'advanced' }));
    expect(code.startsWith(SHARE_CODE_PREFIX)).toBe(true);
    expect(looksLikeShareCode(code)).toBe(true);

    const decoded = decodeWorkoutShareCode(code, getExercise);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.workout).toMatchObject({
      name: 'Måndagsben',
      goal: 'hypertrophy',
      difficulty: 'advanced',
      rounds: 2,
      transitionSeconds: 20,
      unknownExerciseIds: [],
    });
    expect(decoded.workout.exercises).toEqual([
      { exerciseId: 'squat', sets: 3, prescription: { kind: 'reps', reps: 10 }, restSeconds: 60 },
      { exerciseId: 'plank', sets: 2, prescription: { kind: 'time', seconds: 40 }, restSeconds: 30 },
    ]);
  });

  it('finds the code inside a sentence, as it arrives in a chat message', () => {
    const code = encodeWorkoutShareCode(draft());
    const decoded = decodeWorkoutShareCode(`Kolla mitt pass! ${code} /Anna`, getExercise);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.workout.name).toBe('Måndagsben');
  });

  it('clamps every number so a hand-edited code stays runnable', () => {
    const body = JSON.stringify({
      v: 1,
      n: 'Extrem',
      g: 'nonsense',
      d: 'nonsense',
      a: 'rainbow',
      t: 9999,
      r: 99,
      e: [{ x: 'squat', s: 99, p: { k: 'reps', n: 100000 }, r: -5 }],
    });
    const decoded = decodeWorkoutShareCode(`${SHARE_CODE_PREFIX}${body}`, getExercise);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.workout.goal).toBe('strength'); // fallback
    expect(decoded.workout.difficulty).toBe('intermediate');
    expect(decoded.workout.accent).toBe('red');
    expect(decoded.workout.transitionSeconds).toBe(120);
    expect(decoded.workout.rounds).toBe(10);
    expect(decoded.workout.exercises[0]).toEqual({
      exerciseId: 'squat',
      sets: 10,
      prescription: { kind: 'reps', reps: 100 },
      restSeconds: 0,
    });
  });

  it('drops exercises this installation does not know, and says which', () => {
    const body = JSON.stringify({
      v: 1,
      n: 'Framtidspass',
      e: [
        { x: 'squat', s: 3, p: { k: 'reps', n: 10 }, r: 60 },
        { x: 'hoverboard-squat', s: 3, p: { k: 'reps', n: 10 }, r: 60 },
      ],
    });
    const decoded = decodeWorkoutShareCode(body, getExercise);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.workout.exercises.map((e) => e.exerciseId)).toEqual(['squat']);
    expect(decoded.workout.unknownExerciseIds).toEqual(['hoverboard-squat']);
  });

  it('reports why a code cannot be used', () => {
    expect(decodeWorkoutShareCode('   ', getExercise)).toEqual({ ok: false, error: 'empty' });
    expect(decodeWorkoutShareCode('hej hej', getExercise)).toEqual({ ok: false, error: 'malformed' });
    expect(decodeWorkoutShareCode('{ not json }', getExercise)).toEqual({ ok: false, error: 'malformed' });
    expect(
      decodeWorkoutShareCode(`${SHARE_CODE_PREFIX}{"v":9,"n":"Ny","e":[{"x":"squat","p":{"k":"reps","n":5}}]}`, getExercise),
    ).toEqual({ ok: false, error: 'unsupportedVersion' });
    expect(decodeWorkoutShareCode(`${SHARE_CODE_PREFIX}{"v":1,"n":"  ","e":[]}`, getExercise)).toEqual({
      ok: false,
      error: 'noName',
    });
    expect(
      decodeWorkoutShareCode(`${SHARE_CODE_PREFIX}{"v":1,"n":"Tom","e":[{"x":"okänd","p":{"k":"reps","n":5}}]}`, getExercise),
    ).toEqual({ ok: false, error: 'noExercises' });
  });

  it('turns a decoded workout into a fresh editable draft', () => {
    const code = encodeWorkoutShareCode(draft({ rounds: 3 }));
    const decoded = decodeWorkoutShareCode(code, getExercise);
    if (!decoded.ok) throw new Error('should decode');
    const imported = draftFromSharedWorkout(decoded.workout, { id: 'cw_imported', accent: 'cyan', now: NOW });
    expect(imported).toMatchObject({
      id: 'cw_imported',
      name: 'Måndagsben',
      accent: 'cyan',
      rounds: 3,
      createdAt: NOW,
      updatedAt: NOW,
    });
    // Rounds = 1 is stored by omitting the field (older builds read it as 1)
    const single = draftFromSharedWorkout({ ...decoded.workout, rounds: 1 }, { id: 'cw_2', now: NOW });
    expect(single.rounds).toBeUndefined();
  });
});
