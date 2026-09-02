import { lz, type Workout } from '../domain';
import { buildSessionPlan, estimatePlanDuration } from '../engine/planner';
import { BLOCK_MAIN, lookup, plan, WORKOUT } from '../testing/fixtures';

describe('buildSessionPlan', () => {
  it('flattens blocks → exercises → sets into ordered steps', () => {
    const p = plan();
    expect(p.steps.map((s) => `${s.exercise.id}#${s.setNumber}`)).toEqual([
      'squat#1',
      'squat#2',
      'plank#1',
    ]);
    expect(p.steps.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it('uses set rest between sets, transition rest between exercises and 0 at the end', () => {
    const p = plan();
    expect(p.steps.map((s) => s.baseRestSeconds)).toEqual([10, 20, 0]);
  });

  it('marks the last set of each exercise', () => {
    const p = plan();
    expect(p.steps.map((s) => s.isLastSetOfExercise)).toEqual([false, true, true]);
  });

  it('expands rounds', () => {
    const workout: Workout = {
      ...WORKOUT,
      blocks: [{ ...BLOCK_MAIN, rounds: 2 }],
    };
    const p = buildSessionPlan(workout, lookup);
    expect(p.steps).toHaveLength(6);
    expect(p.steps[0]?.round).toBe(1);
    expect(p.steps[3]?.round).toBe(2);
    expect(p.steps[5]?.baseRestSeconds).toBe(0);
    // end of round 1 is a transition, not the end
    expect(p.steps[2]?.baseRestSeconds).toBe(20);
  });

  it('honours per-exercise rest overrides', () => {
    const workout: Workout = {
      ...WORKOUT,
      blocks: [
        {
          ...BLOCK_MAIN,
          exercises: [
            { exerciseId: 'squat', sets: 3, prescription: { kind: 'reps', reps: 5 }, restSeconds: 3 },
          ],
        },
      ],
    };
    const p = buildSessionPlan(workout, lookup);
    expect(p.steps.map((s) => s.baseRestSeconds)).toEqual([3, 3, 0]);
  });

  it('throws on unknown exercise ids', () => {
    const workout: Workout = {
      ...WORKOUT,
      blocks: [
        {
          ...BLOCK_MAIN,
          exercises: [{ exerciseId: 'nope', sets: 1, prescription: { kind: 'reps', reps: 1 } }],
        },
      ],
    };
    expect(() => buildSessionPlan(workout, lookup)).toThrow(/unknown exercise "nope"/);
  });

  it('estimates duration including work, rest and get-ready time', () => {
    const p = plan();
    // squat: 2 sets × 5 reps × 2 s = 20; plank 10 s; rest 10 + 20; get-ready 3×5
    expect(estimatePlanDuration(p, 1)).toBe(20 + 10 + 30 + 15);
  });

  it('handles an empty workout', () => {
    const workout: Workout = { ...WORKOUT, blocks: [], title: lz('Tom', 'Empty') };
    expect(buildSessionPlan(workout, lookup).steps).toHaveLength(0);
  });
});
