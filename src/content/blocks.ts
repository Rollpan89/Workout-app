import { lz, type WorkoutBlock } from '@/core/domain';

/**
 * Reusable workout blocks. Programs are composed from these.
 * A block can appear in several programs, so keep them self-contained.
 */

export const WARMUP_DYNAMIC: WorkoutBlock = {
  id: 'warmup-dynamic',
  title: lz('Uppvärmning', 'Warm-up'),
  kind: 'warmup',
  restSeconds: 0,
  transitionSeconds: 5,
  exercises: [
    { exerciseId: 'jumping-jack', sets: 1, prescription: { kind: 'time', seconds: 40 } },
    { exerciseId: 'arm-circles', sets: 1, prescription: { kind: 'time', seconds: 20 } },
    { exerciseId: 'hip-circles', sets: 1, prescription: { kind: 'time', seconds: 20 } },
    { exerciseId: 'squat', sets: 1, prescription: { kind: 'reps', reps: 10 } },
  ],
};

export const WARMUP_SHORT: WorkoutBlock = {
  id: 'warmup-short',
  title: lz('Snabb uppvärmning', 'Quick warm-up'),
  kind: 'warmup',
  restSeconds: 0,
  transitionSeconds: 5,
  exercises: [
    { exerciseId: 'jumping-jack', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    { exerciseId: 'high-knees', sets: 1, prescription: { kind: 'time', seconds: 20 } },
  ],
};

export const COOLDOWN_STRETCH: WorkoutBlock = {
  id: 'cooldown-stretch',
  title: lz('Nedvarvning', 'Cool-down'),
  kind: 'cooldown',
  restSeconds: 0,
  transitionSeconds: 5,
  exercises: [
    { exerciseId: 'cat-cow', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    { exerciseId: 'hamstring-stretch', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    { exerciseId: 'quad-stretch', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    { exerciseId: 'child-pose', sets: 1, prescription: { kind: 'time', seconds: 30 } },
  ],
};

export const LOWER_BODY_STRENGTH: WorkoutBlock = {
  id: 'lower-strength',
  title: lz('Underkropp – styrka', 'Lower body – strength'),
  kind: 'main',
  restSeconds: 60,
  transitionSeconds: 30,
  exercises: [
    { exerciseId: 'goblet-squat', sets: 4, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'romanian-deadlift', sets: 4, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'lunge', sets: 3, prescription: { kind: 'reps', reps: 12 } },
    { exerciseId: 'calf-raise', sets: 3, prescription: { kind: 'reps', reps: 15 }, restSeconds: 30 },
  ],
};

export const UPPER_BODY_STRENGTH: WorkoutBlock = {
  id: 'upper-strength',
  title: lz('Överkropp – styrka', 'Upper body – strength'),
  kind: 'main',
  restSeconds: 60,
  transitionSeconds: 30,
  exercises: [
    { exerciseId: 'push-up', sets: 4, prescription: { kind: 'reps', reps: 12 } },
    { exerciseId: 'bent-over-row', sets: 4, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'shoulder-press', sets: 3, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'bicep-curl', sets: 3, prescription: { kind: 'reps', reps: 12 }, restSeconds: 45 },
    { exerciseId: 'tricep-dip', sets: 3, prescription: { kind: 'reps', reps: 12 }, restSeconds: 45 },
  ],
};

export const BODYWEIGHT_FULL: WorkoutBlock = {
  id: 'bodyweight-full',
  title: lz('Helkropp – kroppsvikt', 'Full body – bodyweight'),
  kind: 'main',
  restSeconds: 45,
  transitionSeconds: 20,
  exercises: [
    { exerciseId: 'squat', sets: 3, prescription: { kind: 'reps', reps: 15 } },
    { exerciseId: 'push-up', sets: 3, prescription: { kind: 'reps', reps: 12 } },
    { exerciseId: 'lunge', sets: 3, prescription: { kind: 'reps', reps: 12 } },
    { exerciseId: 'glute-bridge', sets: 3, prescription: { kind: 'reps', reps: 15 } },
    { exerciseId: 'plank', sets: 3, prescription: { kind: 'time', seconds: 40 } },
  ],
};

export const HIIT_CIRCUIT: WorkoutBlock = {
  id: 'hiit-circuit',
  title: lz('HIIT-cirkel', 'HIIT circuit'),
  kind: 'main',
  restSeconds: 15,
  transitionSeconds: 15,
  rounds: 3,
  exercises: [
    { exerciseId: 'burpee', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    { exerciseId: 'mountain-climber', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    { exerciseId: 'jump-squat', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    { exerciseId: 'high-knees', sets: 1, prescription: { kind: 'time', seconds: 30 } },
  ],
};

export const CORE_CRUSHER: WorkoutBlock = {
  id: 'core-crusher',
  title: lz('Core', 'Core'),
  kind: 'main',
  restSeconds: 30,
  transitionSeconds: 15,
  rounds: 2,
  exercises: [
    { exerciseId: 'crunch', sets: 1, prescription: { kind: 'reps', reps: 20 } },
    { exerciseId: 'leg-raise', sets: 1, prescription: { kind: 'reps', reps: 12 } },
    { exerciseId: 'russian-twist', sets: 1, prescription: { kind: 'reps', reps: 20 } },
    { exerciseId: 'plank', sets: 1, prescription: { kind: 'time', seconds: 45 } },
    { exerciseId: 'side-plank', sets: 2, prescription: { kind: 'time', seconds: 30 }, restSeconds: 10 },
  ],
};

export const KETTLEBELL_ENGINE: WorkoutBlock = {
  id: 'kettlebell-engine',
  title: lz('Kettlebell-motor', 'Kettlebell engine'),
  kind: 'main',
  restSeconds: 30,
  transitionSeconds: 20,
  rounds: 4,
  exercises: [
    { exerciseId: 'kettlebell-swing', sets: 1, prescription: { kind: 'reps', reps: 15 } },
    { exerciseId: 'goblet-squat', sets: 1, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'push-up', sets: 1, prescription: { kind: 'reps', reps: 10 } },
  ],
};

export const FINISHER_BURN: WorkoutBlock = {
  id: 'finisher-burn',
  title: lz('Finisher', 'Finisher'),
  kind: 'finisher',
  restSeconds: 10,
  transitionSeconds: 10,
  exercises: [
    { exerciseId: 'burpee', sets: 2, prescription: { kind: 'reps', reps: 8 } },
    { exerciseId: 'wall-sit', sets: 1, prescription: { kind: 'time', seconds: 45 } },
  ],
};

export const MOBILITY_FLOW: WorkoutBlock = {
  id: 'mobility-flow',
  title: lz('Rörlighetsflöde', 'Mobility flow'),
  kind: 'main',
  restSeconds: 0,
  transitionSeconds: 5,
  rounds: 2,
  exercises: [
    { exerciseId: 'cat-cow', sets: 1, prescription: { kind: 'time', seconds: 45 } },
    { exerciseId: 'hip-circles', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    { exerciseId: 'arm-circles', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    { exerciseId: 'hamstring-stretch', sets: 1, prescription: { kind: 'time', seconds: 45 } },
    { exerciseId: 'quad-stretch', sets: 1, prescription: { kind: 'time', seconds: 45 } },
    { exerciseId: 'child-pose', sets: 1, prescription: { kind: 'time', seconds: 45 } },
  ],
};
