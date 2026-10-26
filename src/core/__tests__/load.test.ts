import { EXERCISES } from '@/content';
import { lz, type MuscleGroup, type SessionLog, type Workout } from '../domain';
import { getCoachScript } from '../coach/script';
import {
  buildLoadCue,
  formatKg,
  lastLoad,
  loadRole,
  loadStepKg,
  nextWeightKg,
  platesPerSide,
  recommendToday,
  stepWeightKg,
  suggestLoad,
  type LoadProfile,
} from '../load/load';

const DAY = 86_400_000;

function log(partial: Partial<SessionLog> & Pick<SessionLog, 'endedAt'>): SessionLog {
  return {
    id: partial.endedAt,
    workoutId: 'w',
    startedAt: partial.endedAt,
    durationSeconds: 1800,
    workSeconds: 900,
    completed: true,
    averageIntensity: 1,
    totalReps: 10,
    totalSets: 1,
    estimatedCalories: 100,
    muscleImpact: {},
    ...partial,
  };
}

function workout(id: string, muscles: readonly MuscleGroup[], minutes = 40): Workout {
  return {
    id,
    title: lz(id, id),
    tagline: lz('', ''),
    description: lz('', ''),
    goal: 'hypertrophy',
    difficulty: 'intermediate',
    equipment: ['dumbbells'],
    primaryMuscles: muscles,
    blocks: [],
    estimatedMinutes: minutes,
    accent: 'violet',
  };
}

const deadlift: LoadProfile = {
  id: 'deadlift',
  category: 'strength',
  equipment: ['barbell'],
  muscles: { hamstrings: 1, glutes: 1, back: 0.8 },
};
const curl: LoadProfile = {
  id: 'bicep-curl',
  category: 'strength',
  equipment: ['dumbbells'],
  muscles: { biceps: 1 },
};

function clean(exerciseId: string, weightKg: number, endedAt: string, reps = 8): SessionLog {
  return log({
    endedAt,
    sets: [{ exerciseId, reps, seconds: 20, weightKg, targetReps: reps }],
  });
}

describe('plates and progressive overload', () => {
  it('splits a 20 kg bar into plates per side, or says nothing when it does not divide', () => {
    expect(platesPerSide(20)).toEqual([]);
    expect(platesPerSide(60)).toEqual([20]);
    expect(platesPerSide(62.5)).toEqual([20, 1.25]);
    expect(platesPerSide(70)).toEqual([25]);
    expect(platesPerSide(100)).toEqual([25, 15]);
    expect(platesPerSide(17)).toBeUndefined();
    expect(platesPerSide(21)).toBeUndefined();
  });

  it('gives a base lift a small jump after one clean session, and nothing if it was heavy or short', () => {
    const cleanLift = { weightKg: 60, reps: 5, completedAll: true, feltHeavy: false, at: '', cleanStreak: 1 };
    expect(nextWeightKg(cleanLift, 'compound', ['barbell'])).toBe(62.5);
    expect(nextWeightKg({ ...cleanLift, feltHeavy: true, cleanStreak: 0 }, 'compound', ['barbell'])).toBe(60);
    expect(nextWeightKg({ ...cleanLift, completedAll: false, cleanStreak: 0 }, 'compound', ['barbell'])).toBe(60);
    expect(loadStepKg('compound', ['dumbbells'])).toBe(2);
  });

  it('does not add 2.5 kg to an isolation lift after a single clean session', () => {
    const once = { weightKg: 10, reps: 12, completedAll: true, feltHeavy: false, at: '', cleanStreak: 1 };
    expect(nextWeightKg(once, 'isolation', ['dumbbells'])).toBe(10);
    expect(nextWeightKg({ ...once, cleanStreak: 2 }, 'isolation', ['dumbbells'])).toBe(11);
    expect(nextWeightKg({ ...once, weightKg: 30, cleanStreak: 2 }, 'isolation', ['barbell'])).toBe(32.5);
    expect(nextWeightKg({ ...once, cleanStreak: 2 }, 'none', [])).toBe(10);
  });

  it('reads the newest logged weight and keeps a short or heavy session where it is', () => {
    const older = '2026-09-01T10:00:00.000Z';
    const newer = '2026-09-20T10:00:00.000Z';
    const logs = [
      log({
        endedAt: older,
        sets: [{ exerciseId: 'squat', reps: 5, seconds: 20, weightKg: 40, targetReps: 5 }],
      }),
      log({
        endedAt: newer,
        sets: [
          { exerciseId: 'squat', reps: 5, seconds: 20, weightKg: 60, targetReps: 5 },
          { exerciseId: 'squat', reps: 3, seconds: 20, weightKg: 60, targetReps: 5, feltHeavy: true },
        ],
      }),
    ];
    expect(lastLoad(logs, 'squat')).toMatchObject({
      weightKg: 60,
      reps: 3,
      completedAll: false,
      feltHeavy: true,
    });
    expect(suggestLoad(logs, 'squat', undefined, deadlift).todayKg).toBe(60);
    expect(suggestLoad(logs, 'squat', undefined, deadlift).held).toBe(true);
    expect(suggestLoad([], 'squat', 40).todayKg).toBe(40);
  });

  it('waits a session on a curl, then adds a kilo — and never progresses a plank', () => {
    const first = suggestLoad([clean('bicep-curl', 10, '2026-09-01T10:00:00.000Z', 12)], 'bicep-curl', undefined, curl);
    expect(first).toMatchObject({ todayKg: 10, increased: false, waiting: true, held: false });

    const second = suggestLoad(
      [
        clean('bicep-curl', 10, '2026-09-01T10:00:00.000Z', 12),
        clean('bicep-curl', 10, '2026-09-08T10:00:00.000Z', 12),
      ],
      'bicep-curl',
      undefined,
      curl,
    );
    expect(second).toMatchObject({ todayKg: 11, increased: true, small: true, waiting: false });

    const plank = suggestLoad(
      [clean('plank', 10, '2026-09-01T10:00:00.000Z'), clean('plank', 10, '2026-09-08T10:00:00.000Z')],
      'plank',
      undefined,
      { id: 'plank', category: 'core', equipment: ['none'], muscles: { core: 1 } },
    );
    expect(plank).toMatchObject({ todayKg: 10, increased: false, waiting: false, held: false, role: 'none' });
  });

  it('classifies the catalog: base lifts, isolation, and movements that do not progress in kilos', () => {
    expect(loadRole(deadlift)).toBe('compound');
    expect(loadRole(curl)).toBe('isolation');
    expect(loadRole({ id: 'jumping-jack', category: 'cardio', muscles: { fullBody: 1 } })).toBe('none');
    expect(EXERCISES.filter((exercise) => loadRole(exercise) === 'compound').map((exercise) => exercise.id).sort()).toEqual(
      [
        'barbell-hip-thrust',
        'barbell-row',
        'barbell-squat',
        'bench-press',
        'bent-over-row',
        'close-grip-bench-press',
        'deadlift',
        'decline-bench-press',
        'dumbbell-bench-press',
        'dumbbell-step-up',
        'goblet-squat',
        'incline-bench-press',
        'incline-dumbbell-press',
        'lunge',
        'one-arm-dumbbell-row',
        'overhead-press',
        'push-up',
        'pull-up',
        'renegade-row',
        'romanian-deadlift',
        'shoulder-press',
        'squat',
      ].sort(),
    );
    expect(EXERCISES.filter((exercise) => loadRole(exercise) === 'none').map((exercise) => exercise.id)).toContain(
      'kettlebell-swing',
    );
    expect(EXERCISES.filter((exercise) => loadRole(exercise) === 'isolation').map((exercise) => exercise.id)).toContain(
      'dumbbell-lateral-raise',
    );
  });

  it('speaks an override as chosen, without claiming a progression', () => {
    const logs = [
      log({
        endedAt: '2026-09-20T10:00:00.000Z',
        sets: [{ exerciseId: 'bench', reps: 8, seconds: 30, weightKg: 60, targetReps: 8 }],
      }),
    ];
    const cue = buildLoadCue(suggestLoad(logs, 'bench'), ['barbell'], 70);
    expect(cue).toMatchObject({
      todayKg: 70,
      lastKg: 60,
      lastReps: 8,
      plates: [25],
      increased: false,
      held: false,
    });
    expect(getCoachScript('sv').plates([20, 2.5])).toBe('Tjugo och två och en halv på varje sida.');
    expect(getCoachScript('en').plates([25, 15])).toBe('Twenty-five and fifteen on each side.');
    expect(formatKg(62.5, 'sv')).toBe('62,5');
  });

  it('steps onto an empty bar, then by 2.5 kg', () => {
    expect(stepWeightKg(0, 1, ['barbell'])).toBe(20);
    expect(stepWeightKg(0, 1, ['dumbbells'])).toBe(2.5);
    expect(stepWeightKg(60, 1, ['barbell'])).toBe(62.5);
    expect(stepWeightKg(300, 1, ['barbell'])).toBe(300);
  });
});

describe('recommendToday', () => {
  const now = new Date(2026, 8, 24, 12).getTime();

  it('starts on a full-body session while it has nothing to learn from', () => {
    const pick = recommendToday(
      [workout('lower-power', ['quads']), workout('full-body-blast', ['quads', 'chest'], 28)],
      [],
      now,
    );
    expect(pick).toMatchObject({ workout: { id: 'full-body-blast' }, learning: true, daysRested: 0 });
  });

  it('names the muscle that has rested longest and the workout they usually do for it', () => {
    const chest = new Date(now - 3 * DAY).toISOString();
    const legs = new Date(now - DAY).toISOString();
    const logs = [
      log({ endedAt: chest, workoutId: 'upper-armour', muscleImpact: { chest: 1 } }),
      log({ endedAt: chest, workoutId: 'upper-armour', muscleImpact: { chest: 1 } }),
      log({ endedAt: legs, workoutId: 'lower-power', muscleImpact: { quads: 1 } }),
    ];
    const pick = recommendToday(
      [
        workout('lower-power', ['quads'], 35),
        workout('chest-burn', ['chest'], 30),
        workout('upper-armour', ['chest', 'back', 'shoulders'], 40),
      ],
      logs,
      now,
    );
    expect(pick).toMatchObject({
      workout: { id: 'upper-armour' },
      muscle: 'chest',
      daysRested: 3,
      learning: false,
    });
  });

  it('does not repeat a workout already done today when another one hits the rested muscle', () => {
    const chest = new Date(now - 3 * DAY).toISOString();
    const logs = [
      log({ endedAt: chest, workoutId: 'upper-armour', muscleImpact: { chest: 1 } }),
      log({ endedAt: chest, workoutId: 'upper-armour', muscleImpact: { chest: 1 } }),
      log({ endedAt: new Date(now).toISOString(), workoutId: 'upper-armour', muscleImpact: { quads: 1 } }),
    ];
    const pick = recommendToday(
      [workout('upper-armour', ['chest', 'back'], 40), workout('chest-burn', ['chest'], 30)],
      logs,
      now,
    );
    expect(pick?.workout.id).toBe('chest-burn');
    expect(pick?.daysRested).toBe(3);
  });
});
