import { lz, type Exercise, type Workout, type WorkoutBlock } from '../domain';
import { buildSessionPlan } from '../engine/planner';

export const EX_SQUAT: Exercise = {
  id: 'squat',
  name: lz('Knäböj', 'Squat'),
  cue: lz('Bröstet upp.', 'Chest up.'),
  category: 'strength',
  equipment: ['none'],
  muscles: { quads: 1, glutes: 0.8 },
  met: 5,
  secondsPerRep: 2,
};

export const EX_PLANK: Exercise = {
  id: 'plank',
  name: lz('Planka', 'Plank'),
  category: 'core',
  equipment: ['none'],
  muscles: { core: 1 },
  met: 3.5,
  secondsPerRep: 1,
};

export const FIXTURE_EXERCISES = [EX_SQUAT, EX_PLANK];

export const lookup = (id: string): Exercise | undefined => FIXTURE_EXERCISES.find((e) => e.id === id);

export const BLOCK_MAIN: WorkoutBlock = {
  id: 'main',
  title: lz('Huvuddel', 'Main'),
  kind: 'main',
  restSeconds: 10,
  transitionSeconds: 20,
  exercises: [
    { exerciseId: 'squat', sets: 2, prescription: { kind: 'reps', reps: 5 } },
    { exerciseId: 'plank', sets: 1, prescription: { kind: 'time', seconds: 10 } },
  ],
};

export const WORKOUT: Workout = {
  id: 'test-workout',
  title: lz('Test', 'Test'),
  tagline: lz('Test', 'Test'),
  description: lz('Test', 'Test'),
  goal: 'strength',
  difficulty: 'beginner',
  equipment: ['none'],
  primaryMuscles: ['quads'],
  blocks: [BLOCK_MAIN],
  estimatedMinutes: 5,
  accent: 'red',
};

export const plan = () => buildSessionPlan(WORKOUT, lookup);

/** Deterministic manual clock for engine tests. */
export class FakeClock {
  private t = 1_000_000;
  now = (): number => this.t;
  advance(ms: number): void {
    this.t += ms;
  }
}
