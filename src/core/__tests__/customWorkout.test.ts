import { LocalCustomWorkoutRepository } from '../../data/repositories/local';
import { MemoryStore } from '../../data/storage/KeyValueStore';
import {
  compileDraft,
  createEmptyDraft,
  defaultDraftExercise,
  draftFromWorkout,
  estimateDraftMinutes,
  nextAccent,
  validateDraft,
  type CustomWorkoutDraft,
} from '../domain/customWorkout';
import { lz, type Exercise, type Workout, type WorkoutBlock } from '../domain';
import { buildSessionPlan } from '../engine/planner';
import { EX_PLANK, EX_SQUAT, lookup, WORKOUT } from '../testing/fixtures';

const NOW = '2026-09-03T10:00:00.000Z';

const EX_JUMPING: Exercise = {
  id: 'jumping-jack',
  name: lz('Sprattelgubbe', 'Jumping jack'),
  category: 'cardio',
  equipment: ['none'],
  muscles: { fullBody: 1 },
  met: 8,
  secondsPerRep: 1,
};
const EX_KB: Exercise = { ...EX_SQUAT, id: 'kb-swing', equipment: ['kettlebell'], muscles: { glutes: 1, hamstrings: 0.8 } };

const find = (id: string) => [EX_SQUAT, EX_PLANK, EX_JUMPING, EX_KB].find((e) => e.id === id) ?? lookup(id);

describe('custom workout drafts', () => {
  it('starts empty and invalid, becomes valid with a name and an exercise', () => {
    const draft = createEmptyDraft('cw1', 'violet', NOW);
    expect(validateDraft(draft)).toEqual(['nameRequired', 'noExercises']);
    const named: CustomWorkoutDraft = { ...draft, name: '  Måndagsben ', exercises: [defaultDraftExercise(EX_SQUAT)] };
    expect(validateDraft(named)).toEqual([]);
  });

  it('picks sensible defaults per exercise category', () => {
    expect(defaultDraftExercise(EX_SQUAT)).toEqual({
      exerciseId: 'squat',
      sets: 3,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 60,
    });
    expect(defaultDraftExercise(EX_JUMPING).prescription).toEqual({ kind: 'time', seconds: 30 });
    expect(defaultDraftExercise(EX_PLANK).prescription).toEqual({ kind: 'time', seconds: 30 }); // core, 1 s/rep → hold
    expect(defaultDraftExercise({ ...EX_PLANK, category: 'mobility' }).sets).toBe(1);
  });

  it('rotates accents towards the least-used colour', () => {
    expect(nextAccent([])).toBe('red');
    expect(nextAccent([{ accent: 'red' }])).toBe('orange');
    const all = ['red', 'orange', 'yellow', 'lime', 'cyan', 'violet', 'magenta'].map((accent) => ({ accent }) as { accent: 'red' });
    expect(nextAccent(all)).toBe('red'); // full cycle → start over
    expect(nextAccent([...all, { accent: 'red' }])).toBe('orange');
  });

  it('compiles into a Workout the planner can run, with derived metadata', () => {
    const draft: CustomWorkoutDraft = {
      ...createEmptyDraft('cw2', 'cyan', NOW),
      name: 'Pushpass',
      goal: 'hypertrophy',
      exercises: [
        { exerciseId: 'squat', sets: 3, prescription: { kind: 'reps', reps: 8 }, restSeconds: 45 },
        { exerciseId: 'kb-swing', sets: 2, prescription: { kind: 'reps', reps: 15 }, restSeconds: 30 },
        { exerciseId: 'plank', sets: 1, prescription: { kind: 'time', seconds: 40 }, restSeconds: 0 },
        { exerciseId: 'ghost', sets: 5, prescription: { kind: 'reps', reps: 5 }, restSeconds: 0 }, // unknown → dropped
      ],
      transitionSeconds: 15,
    };
    const workout = compileDraft(draft, find);

    expect(workout.id).toBe('cw2');
    expect(workout.custom).toBe(true);
    expect(workout.accent).toBe('cyan');
    expect(workout.title).toEqual({ sv: 'Pushpass', en: 'Pushpass' });
    expect(workout.goal).toBe('hypertrophy');
    expect(workout.equipment).toEqual(['kettlebell']);
    // weighted by sets: glutes 3×0.8 + 2×1 = 4.4, quads 3×1 = 3, hamstrings 2×0.8 = 1.6
    expect(workout.primaryMuscles).toEqual(['glutes', 'quads', 'hamstrings']);
    expect(workout.blocks).toHaveLength(1);
    expect(workout.blocks[0]?.exercises).toHaveLength(3);
    expect(workout.blocks[0]?.transitionSeconds).toBe(15);
    expect(workout.blocks[0]?.exercises[0]).toEqual({
      exerciseId: 'squat',
      sets: 3,
      prescription: { kind: 'reps', reps: 8 },
      restSeconds: 45,
    });

    const plan = buildSessionPlan(workout, find);
    expect(plan.steps).toHaveLength(3 + 2 + 1);
    expect(plan.steps[0]?.baseRestSeconds).toBe(45);
    expect(plan.steps[2]?.baseRestSeconds).toBe(15); // last squat set → transition
  });

  it('falls back to "none" equipment when nothing is needed', () => {
    const draft: CustomWorkoutDraft = {
      ...createEmptyDraft('cw3', 'lime', NOW),
      name: 'Bodyweight',
      exercises: [defaultDraftExercise(EX_SQUAT)],
    };
    expect(compileDraft(draft, find).equipment).toEqual(['none']);
  });

  it('estimates duration from cadence, sets, rest and transitions', () => {
    const draft: CustomWorkoutDraft = {
      ...createEmptyDraft('cw4', 'red', NOW),
      name: 'x',
      exercises: [
        { exerciseId: 'squat', sets: 2, prescription: { kind: 'reps', reps: 10 }, restSeconds: 60 }, // 2×(20+5) + 60 = 110
        { exerciseId: 'plank', sets: 1, prescription: { kind: 'time', seconds: 60 }, restSeconds: 0 }, // 65
      ],
      transitionSeconds: 30, // +30 between the two
    };
    expect(estimateDraftMinutes(draft, find)).toBe(Math.round((110 + 30 + 65) / 60)); // ≈ 3
  });

  it('copies a built-in workout, expanding rounds into a flat list', () => {
    const circuit: WorkoutBlock = {
      id: 'circuit',
      title: lz('Cirkel', 'Circuit'),
      kind: 'main',
      restSeconds: 15,
      transitionSeconds: 10,
      rounds: 2,
      exercises: [
        { exerciseId: 'squat', sets: 1, prescription: { kind: 'reps', reps: 12 } },
        { exerciseId: 'plank', sets: 1, prescription: { kind: 'time', seconds: 30 }, restSeconds: 5 },
      ],
    };
    const source: Workout = { ...WORKOUT, id: 'src', blocks: [circuit], accent: 'red' };
    const draft = draftFromWorkout(source, 'cw5', 'Test (kopia)', 'magenta', NOW);

    expect(draft.sourceId).toBe('src');
    expect(draft.name).toBe('Test (kopia)');
    expect(draft.accent).toBe('magenta');
    expect(draft.goal).toBe(source.goal);
    expect(draft.transitionSeconds).toBe(10);
    expect(draft.exercises.map((e) => e.exerciseId)).toEqual(['squat', 'plank', 'squat', 'plank']);
    expect(draft.exercises[0]?.restSeconds).toBe(15); // block default
    expect(draft.exercises[1]?.restSeconds).toBe(5); // per-exercise override

    // Round-trips to a runnable workout with the same amount of work
    const compiled = compileDraft(draft, find);
    expect(buildSessionPlan(compiled, find).steps).toHaveLength(buildSessionPlan(source, find).steps.length);
  });
});

describe('LocalCustomWorkoutRepository', () => {
  it('saves, lists (newest first), updates and deletes drafts', async () => {
    const repo = new LocalCustomWorkoutRepository(new MemoryStore());
    const a = { ...createEmptyDraft('a', 'red', '2026-01-01T00:00:00.000Z'), name: 'A' };
    const b = { ...createEmptyDraft('b', 'lime', '2026-01-02T00:00:00.000Z'), name: 'B' };
    await repo.saveDraft(a);
    await repo.saveDraft(b);
    expect((await repo.listDrafts()).map((d) => d.id)).toEqual(['b', 'a']);

    await repo.saveDraft({ ...a, name: 'A2', updatedAt: '2026-01-03T00:00:00.000Z' });
    expect((await repo.listDrafts()).map((d) => d.name)).toEqual(['A2', 'B']);
    expect((await repo.getDraft('a'))?.name).toBe('A2');

    await repo.deleteDraft('b');
    expect((await repo.listDrafts()).map((d) => d.id)).toEqual(['a']);
    expect(await repo.getDraft('b')).toBeUndefined();
  });
});
