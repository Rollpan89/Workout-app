import type { Exercise } from '../domain/exercise';
import type { Workout } from '../domain/workout';
import type { PlanStep, SessionPlan } from './types';

export type ExerciseLookup = (id: string) => Exercise | undefined;

/**
 * Flattens a modular workout (blocks → rounds → exercises → sets) into a
 * linear list of steps. The engine only ever has to think about "current
 * step" and "next step" after this.
 */
export function buildSessionPlan(workout: Workout, lookup: ExerciseLookup): SessionPlan {
  const steps: PlanStep[] = [];

  for (const block of workout.blocks) {
    const rounds = Math.max(1, block.rounds ?? 1);

    for (let round = 1; round <= rounds; round++) {
      block.exercises.forEach((workoutExercise, exerciseIdx) => {
        const exercise = lookup(workoutExercise.exerciseId);
        if (!exercise) {
          throw new Error(
            `Workout "${workout.id}" references unknown exercise "${workoutExercise.exerciseId}"`,
          );
        }

        const totalSets = Math.max(1, workoutExercise.sets);
        const isLastExerciseInBlock = exerciseIdx === block.exercises.length - 1;

        for (let setNumber = 1; setNumber <= totalSets; setNumber++) {
          const isLastSetOfExercise = setNumber === totalSets;
          const isVeryLastStep =
            isLastSetOfExercise &&
            isLastExerciseInBlock &&
            round === rounds &&
            block === workout.blocks[workout.blocks.length - 1];

          let baseRestSeconds: number;
          if (isVeryLastStep) {
            baseRestSeconds = 0;
          } else if (isLastSetOfExercise) {
            baseRestSeconds = block.transitionSeconds;
          } else {
            baseRestSeconds = workoutExercise.restSeconds ?? block.restSeconds;
          }

          steps.push({
            index: steps.length,
            block,
            round,
            rounds,
            workoutExercise,
            exercise,
            setNumber,
            totalSets,
            isLastSetOfExercise,
            baseRestSeconds,
          });
        }
      });
    }
  }

  return { workout, steps };
}

/** Estimated duration at a given intensity, in seconds (for display). */
export function estimatePlanDuration(plan: SessionPlan, intensity = 1): number {
  let total = 0;
  for (const step of plan.steps) {
    const p = step.workoutExercise.prescription;
    if (p.kind === 'reps') {
      total += Math.round(p.reps * intensity) * step.exercise.secondsPerRep;
    } else {
      total += Math.round(p.seconds * intensity);
    }
    total += step.baseRestSeconds / intensity;
    total += 5; // get-ready countdown
  }
  return Math.round(total);
}
