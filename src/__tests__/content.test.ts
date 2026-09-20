/**
 * Data-integrity checks for the static content catalog. Guards every built-in
 * program (including the Muscle & Strength library) against typos in
 * exercise ids, duplicate blocks, empty instructions and broken metadata.
 */
import { ALL_MUSCLE_GROUPS, type Equipment, type WorkoutGoal } from '@/core/domain';
import { EXERCISES, getExercise, WORKOUTS } from '@/content';

const EQUIPMENT_IDS: readonly Equipment[] = [
  'none',
  'dumbbells',
  'barbell',
  'kettlebell',
  'bench',
  'pullUpBar',
];
const GOAL_IDS: readonly WorkoutGoal[] = [
  'strength',
  'hypertrophy',
  'endurance',
  'fatLoss',
  'mobility',
];
const MUSCLE_IDS = ALL_MUSCLE_GROUPS;

describe('exercise catalog', () => {
  it('has unique ids', () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has complete localized fields', () => {
    for (const exercise of EXERCISES) {
      expect(exercise.name.sv.length).toBeGreaterThan(0);
      expect(exercise.name.en.length).toBeGreaterThan(0);
      if (exercise.cue) {
        expect(exercise.cue.sv.length).toBeGreaterThan(0);
        expect(exercise.cue.en.length).toBeGreaterThan(0);
      }
      for (const step of exercise.instructions?.steps ?? []) {
        expect(step.sv.length).toBeGreaterThan(0);
        expect(step.en.length).toBeGreaterThan(0);
      }
    }
  });

  it('uses registered equipment and sane energy values', () => {
    for (const exercise of EXERCISES) {
      expect(exercise.equipment.length).toBeGreaterThan(0);
      for (const eq of exercise.equipment) expect(EQUIPMENT_IDS).toContain(eq);
      expect(exercise.met).toBeGreaterThan(0);
      expect(exercise.secondsPerRep).toBeGreaterThan(0);
      for (const [muscle, load] of Object.entries(exercise.muscles)) {
        expect(MUSCLE_IDS).toContain(muscle);
        expect(load).toBeGreaterThan(0);
        expect(load).toBeLessThanOrEqual(1);
      }
    }
  });

  it('covers every muscle group with at least one exercise', () => {
    const covered = new Set(EXERCISES.flatMap((e) => Object.keys(e.muscles)));
    for (const muscle of ALL_MUSCLE_GROUPS) expect(covered).toContain(muscle);
  });
});

describe('workout catalog', () => {
  it('has unique workout ids', () => {
    const ids = WORKOUTS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique block ids within each workout and complete metadata', () => {
    for (const workout of WORKOUTS) {
      expect(workout.blocks.length).toBeGreaterThan(0);
      const blockIds = workout.blocks.map((b) => b.id);
      expect(new Set(blockIds).size).toBe(blockIds.length);
      expect(GOAL_IDS).toContain(workout.goal);
      expect(['beginner', 'intermediate', 'advanced']).toContain(workout.difficulty);
      expect(workout.estimatedMinutes).toBeGreaterThan(0);
      expect(workout.title.sv.length).toBeGreaterThan(0);
      expect(workout.tagline.sv.length).toBeGreaterThan(0);
      expect(workout.description.sv.length).toBeGreaterThan(0);
    }
  });

  it('references exercises that exist', () => {
    for (const workout of WORKOUTS) {
      for (const block of workout.blocks) {
        expect(block.exercises.length).toBeGreaterThan(0);
        for (const we of block.exercises) {
          expect(getExercise(we.exerciseId)).toBeDefined();
          expect(we.sets).toBeGreaterThan(0);
          if (we.prescription.kind === 'reps') expect(we.prescription.reps).toBeGreaterThan(0);
          else expect(we.prescription.seconds).toBeGreaterThan(0);
        }
      }
    }
  });

  it('offers the full goal spread across the library', () => {
    const goals = new Set(WORKOUTS.map((w) => w.goal));
    for (const goal of GOAL_IDS) expect(goals).toContain(goal);
  });
});
