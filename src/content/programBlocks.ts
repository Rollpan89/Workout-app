import { lz, type WorkoutBlock } from '@/core/domain';

/**
 * Blocks backing the Muscle & Strength program library (see ./workouts.ts).
 * Set/rep schemes are taken from the published routines; where M&S lists a
 * machine/cable movement the closest free-weight equivalent from the app
 * catalog is used (noted in the workout description where relevant).
 */

/* ------------------------------------------------------------------------ */
/* Support blocks                                                            */
/* ------------------------------------------------------------------------ */

export const WARMUP_LIFTING: WorkoutBlock = {
  id: 'warmup-lifting',
  title: lz('Uppvärmning – lyft', 'Warm-up – lifting'),
  kind: 'warmup',
  restSeconds: 0,
  transitionSeconds: 5,
  exercises: [
    { exerciseId: 'jumping-jack', sets: 1, prescription: { kind: 'time', seconds: 40 } },
    { exerciseId: 'arm-circles', sets: 1, prescription: { kind: 'time', seconds: 20 } },
    { exerciseId: 'hip-circles', sets: 1, prescription: { kind: 'time', seconds: 20 } },
    { exerciseId: 'squat', sets: 2, prescription: { kind: 'reps', reps: 8 } },
    { exerciseId: 'push-up', sets: 1, prescription: { kind: 'reps', reps: 10 } },
  ],
};

export const COOLDOWN_LITE: WorkoutBlock = {
  id: 'cooldown-lite',
  title: lz('Nedvarvning', 'Cool-down'),
  kind: 'cooldown',
  restSeconds: 0,
  transitionSeconds: 5,
  exercises: [
    { exerciseId: 'child-pose', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    { exerciseId: 'hamstring-stretch', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    { exerciseId: 'quad-stretch', sets: 1, prescription: { kind: 'time', seconds: 30 } },
  ],
};

/* ------------------------------------------------------------------------ */
/* 1. Ice Cream Fitness 5x5 – Workout A                                      */
/* ------------------------------------------------------------------------ */

export const ICF5X5_A: WorkoutBlock = {
  id: 'icf-5x5-a',
  title: lz('5×5 – Gungning A', '5×5 – Strength A'),
  kind: 'main',
  restSeconds: 180,
  transitionSeconds: 90,
  exercises: [
    { exerciseId: 'barbell-squat', sets: 5, prescription: { kind: 'reps', reps: 5 } },
    { exerciseId: 'bench-press', sets: 5, prescription: { kind: 'reps', reps: 5 } },
    { exerciseId: 'barbell-row', sets: 5, prescription: { kind: 'reps', reps: 5 } },
    {
      exerciseId: 'barbell-shrug',
      sets: 3,
      prescription: { kind: 'reps', reps: 8 },
      restSeconds: 75,
    },
    {
      exerciseId: 'skullcrusher',
      sets: 3,
      prescription: { kind: 'reps', reps: 8 },
      restSeconds: 75,
    },
    {
      exerciseId: 'barbell-curl',
      sets: 3,
      prescription: { kind: 'reps', reps: 8 },
      restSeconds: 75,
    },
    {
      exerciseId: 'hyperextension',
      sets: 2,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 60,
    },
    { exerciseId: 'crunch', sets: 3, prescription: { kind: 'reps', reps: 10 }, restSeconds: 60 },
  ],
};

/* ------------------------------------------------------------------------ */
/* 2. Bill Starr 5x5 – Monday power                                          */
/* ------------------------------------------------------------------------ */

export const STARR5X5_POWER: WorkoutBlock = {
  id: 'starr-5x5-power',
  title: lz('Måndag – kraft 5×5', 'Monday – power 5×5'),
  kind: 'main',
  restSeconds: 180,
  transitionSeconds: 90,
  exercises: [
    { exerciseId: 'barbell-squat', sets: 5, prescription: { kind: 'reps', reps: 5 } },
    { exerciseId: 'bench-press', sets: 5, prescription: { kind: 'reps', reps: 5 } },
    { exerciseId: 'barbell-row', sets: 5, prescription: { kind: 'reps', reps: 5 } },
    {
      exerciseId: 'hyperextension',
      sets: 2,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 90,
    },
    { exerciseId: 'crunch', sets: 4, prescription: { kind: 'reps', reps: 15 }, restSeconds: 60 },
  ],
};

/* ------------------------------------------------------------------------ */
/* 3. PHUL – Day 1 Upper Power                                               */
/* ------------------------------------------------------------------------ */

export const PHUL_UPPER_POWER: WorkoutBlock = {
  id: 'phul-upper-power',
  title: lz('Övre kroppen – kraft', 'Upper power'),
  kind: 'main',
  restSeconds: 150,
  transitionSeconds: 60,
  exercises: [
    { exerciseId: 'bench-press', sets: 4, prescription: { kind: 'reps', reps: 5 } },
    {
      exerciseId: 'incline-dumbbell-press',
      sets: 4,
      prescription: { kind: 'reps', reps: 8 },
      restSeconds: 90,
    },
    { exerciseId: 'barbell-row', sets: 4, prescription: { kind: 'reps', reps: 5 } },
    { exerciseId: 'pull-up', sets: 4, prescription: { kind: 'reps', reps: 8 }, restSeconds: 90 },
    {
      exerciseId: 'overhead-press',
      sets: 3,
      prescription: { kind: 'reps', reps: 6 },
      restSeconds: 90,
    },
    {
      exerciseId: 'barbell-curl',
      sets: 3,
      prescription: { kind: 'reps', reps: 8 },
      restSeconds: 60,
    },
    {
      exerciseId: 'skullcrusher',
      sets: 3,
      prescription: { kind: 'reps', reps: 8 },
      restSeconds: 60,
    },
  ],
};

/* ------------------------------------------------------------------------ */
/* 4. M&S Full Body – Workout A                                              */
/* ------------------------------------------------------------------------ */

export const MSSF_WORKOUT_A: WorkoutBlock = {
  id: 'mssf-workout-a',
  title: lz('Workout A', 'Workout A'),
  kind: 'main',
  restSeconds: 120,
  transitionSeconds: 60,
  exercises: [
    { exerciseId: 'barbell-squat', sets: 5, prescription: { kind: 'reps', reps: 5 } },
    { exerciseId: 'bench-press', sets: 5, prescription: { kind: 'reps', reps: 5 } },
    { exerciseId: 'barbell-row', sets: 5, prescription: { kind: 'reps', reps: 5 } },
    {
      exerciseId: 'upright-row',
      sets: 3,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 75,
    },
    {
      exerciseId: 'skullcrusher',
      sets: 3,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 75,
    },
    {
      exerciseId: 'bicep-curl',
      sets: 3,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 60,
    },
    {
      exerciseId: 'romanian-deadlift',
      sets: 3,
      prescription: { kind: 'reps', reps: 12 },
      restSeconds: 60,
    },
    {
      exerciseId: 'ab-wheel-rollout',
      sets: 3,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 60,
    },
  ],
};

/* ------------------------------------------------------------------------ */
/* 5. The Total Package – Day 1                                              */
/* ------------------------------------------------------------------------ */

export const TOTAL_PACKAGE_D1: WorkoutBlock = {
  id: 'total-package-d1',
  title: lz('Dag 1 – Knäböj i fokus', 'Day 1 – Squat focus'),
  kind: 'main',
  restSeconds: 120,
  transitionSeconds: 60,
  exercises: [
    { exerciseId: 'barbell-squat', sets: 5, prescription: { kind: 'reps', reps: 5 } },
    {
      exerciseId: 'dumbbell-bench-press',
      sets: 4,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 75,
    },
    {
      exerciseId: 'bent-over-row',
      sets: 4,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 75,
    },
    {
      exerciseId: 'shoulder-press',
      sets: 4,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 75,
    },
    { exerciseId: 'lunge', sets: 4, prescription: { kind: 'reps', reps: 10 }, restSeconds: 75 },
    {
      exerciseId: 'bicep-curl',
      sets: 3,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 60,
    },
    {
      exerciseId: 'overhead-tricep-extension',
      sets: 3,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 60,
    },
    {
      exerciseId: 'calf-raise',
      sets: 3,
      prescription: { kind: 'reps', reps: 12 },
      restSeconds: 45,
    },
    { exerciseId: 'plank', sets: 5, prescription: { kind: 'time', seconds: 20 }, restSeconds: 45 },
  ],
};

/* ------------------------------------------------------------------------ */
/* 6. Power Muscle Burn – Day 1 Chest & Triceps                              */
/* ------------------------------------------------------------------------ */

export const PMB_CHEST_TRICEPS: WorkoutBlock = {
  id: 'pmb-chest-triceps',
  title: lz('Bröst & triceps – Kraft/Muskel/Bränn', 'Chest & triceps – Power/Muscle/Burn'),
  kind: 'main',
  restSeconds: 90,
  transitionSeconds: 45,
  exercises: [
    {
      exerciseId: 'bench-press',
      sets: 3,
      prescription: { kind: 'reps', reps: 5 },
      restSeconds: 150,
    },
    { exerciseId: 'incline-bench-press', sets: 3, prescription: { kind: 'reps', reps: 8 } },
    { exerciseId: 'dumbbell-bench-press', sets: 3, prescription: { kind: 'reps', reps: 10 } },
    {
      exerciseId: 'dumbbell-fly',
      sets: 1,
      prescription: { kind: 'reps', reps: 40 },
      restSeconds: 90,
    },
    {
      exerciseId: 'close-grip-bench-press',
      sets: 2,
      prescription: { kind: 'reps', reps: 5 },
      restSeconds: 150,
    },
    {
      exerciseId: 'skullcrusher',
      sets: 2,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 75,
    },
    {
      exerciseId: 'overhead-tricep-extension',
      sets: 1,
      prescription: { kind: 'reps', reps: 40 },
      restSeconds: 45,
    },
  ],
};

/* ------------------------------------------------------------------------ */
/* 7. 6-Day PPL – Push Workout A                                             */
/* ------------------------------------------------------------------------ */

export const PPL_PUSH_A: WorkoutBlock = {
  id: 'ppl-push-a',
  title: lz('Push A – totalt antal reps', 'Push A – rep goals'),
  kind: 'main',
  restSeconds: 45,
  transitionSeconds: 45,
  exercises: [
    {
      exerciseId: 'bench-press',
      sets: 5,
      prescription: { kind: 'reps', reps: 3 },
      restSeconds: 105,
    },
    {
      exerciseId: 'overhead-press',
      sets: 3,
      prescription: { kind: 'reps', reps: 8 },
      restSeconds: 60,
    },
    {
      exerciseId: 'tricep-dip',
      sets: 3,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 60,
    },
    {
      exerciseId: 'dumbbell-fly',
      sets: 5,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 30,
    },
    {
      exerciseId: 'overhead-tricep-extension',
      sets: 5,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 30,
    },
    {
      exerciseId: 'dumbbell-lateral-raise',
      sets: 5,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 20,
    },
  ],
};

/* ------------------------------------------------------------------------ */
/* 8. 10-Week Mass Building – Monday Chest & Triceps                         */
/* ------------------------------------------------------------------------ */

export const MASS10_CHEST: WorkoutBlock = {
  id: 'mass10-chest',
  title: lz('Måndag – Bröst & triceps', 'Monday – Chest & triceps'),
  kind: 'main',
  restSeconds: 90,
  transitionSeconds: 45,
  exercises: [
    { exerciseId: 'bench-press', sets: 4, prescription: { kind: 'reps', reps: 8 } },
    { exerciseId: 'incline-bench-press', sets: 3, prescription: { kind: 'reps', reps: 8 } },
    { exerciseId: 'decline-bench-press', sets: 3, prescription: { kind: 'reps', reps: 8 } },
    {
      exerciseId: 'dumbbell-fly',
      sets: 2,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 60,
    },
    {
      exerciseId: 'dumbbell-pullover',
      sets: 2,
      prescription: { kind: 'reps', reps: 8 },
      restSeconds: 60,
    },
    {
      exerciseId: 'skullcrusher',
      sets: 4,
      prescription: { kind: 'reps', reps: 8 },
      restSeconds: 75,
    },
    {
      exerciseId: 'tricep-dip',
      sets: 3,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 60,
    },
  ],
};

/* ------------------------------------------------------------------------ */
/* 9. Dumbbell Only 5-Day – Day 1 Chest, Shoulders & Triceps                 */
/* ------------------------------------------------------------------------ */

export const DB5_PUSH: WorkoutBlock = {
  id: 'db5-push',
  title: lz('Bröst, axlar & triceps', 'Chest, shoulders & triceps'),
  kind: 'main',
  restSeconds: 75,
  transitionSeconds: 45,
  exercises: [
    { exerciseId: 'dumbbell-bench-press', sets: 5, prescription: { kind: 'reps', reps: 9 } },
    { exerciseId: 'incline-dumbbell-press', sets: 4, prescription: { kind: 'reps', reps: 9 } },
    { exerciseId: 'push-up', sets: 3, prescription: { kind: 'reps', reps: 12 }, restSeconds: 60 },
    { exerciseId: 'shoulder-press', sets: 4, prescription: { kind: 'reps', reps: 9 } },
    {
      exerciseId: 'dumbbell-lateral-raise',
      sets: 3,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 45,
    },
    {
      exerciseId: 'overhead-tricep-extension',
      sets: 3,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 45,
    },
  ],
};

/* ------------------------------------------------------------------------ */
/* 10. Dumbbell Only 3-Day Full Body – Day 1                                 */
/* ------------------------------------------------------------------------ */

export const DB3_FULLBODY_A: WorkoutBlock = {
  id: 'db3-fullbody-a',
  title: lz('Dag 1 – Helkropp', 'Day 1 – Full body'),
  kind: 'main',
  restSeconds: 60,
  transitionSeconds: 30,
  exercises: [
    { exerciseId: 'goblet-squat', sets: 3, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'romanian-deadlift', sets: 3, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'bent-over-row', sets: 3, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'dumbbell-bench-press', sets: 3, prescription: { kind: 'reps', reps: 10 } },
    {
      exerciseId: 'dumbbell-lateral-raise',
      sets: 2,
      prescription: { kind: 'reps', reps: 8 },
      restSeconds: 45,
    },
    { exerciseId: 'bicep-curl', sets: 2, prescription: { kind: 'reps', reps: 8 }, restSeconds: 45 },
    {
      exerciseId: 'skullcrusher',
      sets: 2,
      prescription: { kind: 'reps', reps: 8 },
      restSeconds: 45,
    },
  ],
};

/* ------------------------------------------------------------------------ */
/* 11. The Complete Squat Program – Heavy Day                                */
/* ------------------------------------------------------------------------ */

export const SQUAT_HEAVY_DAY: WorkoutBlock = {
  id: 'squat-heavy-day',
  title: lz('Tunga knäböjsdagen', 'Heavy squat day'),
  kind: 'main',
  restSeconds: 180,
  transitionSeconds: 120,
  exercises: [
    { exerciseId: 'barbell-squat', sets: 4, prescription: { kind: 'reps', reps: 5 } },
    {
      exerciseId: 'goblet-squat',
      sets: 3,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 90,
    },
    {
      exerciseId: 'hyperextension',
      sets: 3,
      prescription: { kind: 'reps', reps: 8 },
      restSeconds: 75,
    },
    { exerciseId: 'pull-up', sets: 3, prescription: { kind: 'reps', reps: 6 }, restSeconds: 75 },
  ],
};

/* ------------------------------------------------------------------------ */
/* 12. Deadlift Specialization – Workout A                                   */
/* ------------------------------------------------------------------------ */

export const DEADLIFT_MAIN: WorkoutBlock = {
  id: 'deadlift-main-a',
  title: lz('Marklyft A – tungt', 'Deadlift A – heavy'),
  kind: 'main',
  restSeconds: 150,
  transitionSeconds: 90,
  exercises: [
    { exerciseId: 'deadlift', sets: 3, prescription: { kind: 'reps', reps: 5 } },
    {
      exerciseId: 'goblet-squat',
      sets: 3,
      prescription: { kind: 'reps', reps: 8 },
      restSeconds: 90,
    },
    {
      exerciseId: 'romanian-deadlift',
      sets: 3,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 75,
    },
  ],
};

/* ------------------------------------------------------------------------ */
/* 13. Navy SEAL – Full Body Conditioning Circuit                            */
/* ------------------------------------------------------------------------ */

export const SEAL_CONDITIONING: WorkoutBlock = {
  id: 'seal-conditioning',
  title: lz('SEAL-cirkel', 'SEAL conditioning circuit'),
  kind: 'main',
  restSeconds: 15,
  transitionSeconds: 60,
  rounds: 2,
  exercises: [
    { exerciseId: 'push-up', sets: 1, prescription: { kind: 'reps', reps: 20 } },
    { exerciseId: 'squat', sets: 1, prescription: { kind: 'reps', reps: 20 } },
    { exerciseId: 'pull-up', sets: 1, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'lunge', sets: 1, prescription: { kind: 'reps', reps: 20 } },
    { exerciseId: 'tricep-dip', sets: 1, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'sprint-interval', sets: 1, prescription: { kind: 'time', seconds: 20 } },
    { exerciseId: 'crunch', sets: 1, prescription: { kind: 'reps', reps: 20 } },
  ],
};

/* ------------------------------------------------------------------------ */
/* 14. Tactical Physique – Strength Day                                      */
/* ------------------------------------------------------------------------ */

export const TACTICAL_STRENGTH: WorkoutBlock = {
  id: 'tactical-strength',
  title: lz('Funktionell styrka', 'Functional strength'),
  kind: 'main',
  restSeconds: 120,
  transitionSeconds: 60,
  exercises: [
    { exerciseId: 'barbell-squat', sets: 4, prescription: { kind: 'reps', reps: 5 } },
    { exerciseId: 'romanian-deadlift', sets: 4, prescription: { kind: 'reps', reps: 5 } },
    {
      exerciseId: 'incline-dumbbell-press',
      sets: 4,
      prescription: { kind: 'reps', reps: 6 },
      restSeconds: 60,
    },
    { exerciseId: 'pull-up', sets: 4, prescription: { kind: 'reps', reps: 6 }, restSeconds: 90 },
    { exerciseId: 'push-up', sets: 3, prescription: { kind: 'reps', reps: 12 }, restSeconds: 45 },
    { exerciseId: 'leg-raise', sets: 3, prescription: { kind: 'reps', reps: 15 }, restSeconds: 30 },
    { exerciseId: 'plank', sets: 3, prescription: { kind: 'time', seconds: 30 }, restSeconds: 45 },
    {
      exerciseId: 'sprint-interval',
      sets: 8,
      prescription: { kind: 'time', seconds: 20 },
      restSeconds: 60,
    },
  ],
};

/* ------------------------------------------------------------------------ */
/* 15. Calisthenics for Lifters – 100-rep circuit                            */
/* ------------------------------------------------------------------------ */

export const CALIS_CIRCUIT: WorkoutBlock = {
  id: 'calis-circuit',
  title: lz('100-reps cirkel', '100-rep circuit'),
  kind: 'main',
  restSeconds: 0,
  transitionSeconds: 10,
  rounds: 4,
  exercises: [
    { exerciseId: 'push-up', sets: 1, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'superman', sets: 1, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'crunch', sets: 1, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'bicep-curl', sets: 1, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'mountain-climber', sets: 1, prescription: { kind: 'reps', reps: 20 } },
    { exerciseId: 'jump-squat', sets: 1, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'lunge', sets: 1, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'hamstring-stretch', sets: 1, prescription: { kind: 'time', seconds: 20 } },
    { exerciseId: 'calf-raise', sets: 1, prescription: { kind: 'reps', reps: 10 } },
  ],
};

/* ------------------------------------------------------------------------ */
/* 16. Body Blaster – circuit                                                */
/* ------------------------------------------------------------------------ */

export const BLASTER_CIRCUIT: WorkoutBlock = {
  id: 'blaster-circuit',
  title: lz('Body Blaster-cirkel', 'Body Blaster circuit'),
  kind: 'main',
  restSeconds: 0,
  transitionSeconds: 10,
  rounds: 5,
  exercises: [
    { exerciseId: 'sprint-interval', sets: 1, prescription: { kind: 'time', seconds: 15 } },
    { exerciseId: 'burpee', sets: 1, prescription: { kind: 'reps', reps: 15 } },
    { exerciseId: 'jump-squat', sets: 1, prescription: { kind: 'reps', reps: 15 } },
    { exerciseId: 'lunge', sets: 1, prescription: { kind: 'reps', reps: 16 } },
    { exerciseId: 'crunch', sets: 1, prescription: { kind: 'reps', reps: 15 } },
    { exerciseId: 'push-up', sets: 1, prescription: { kind: 'reps', reps: 15 } },
    { exerciseId: 'mountain-climber', sets: 1, prescription: { kind: 'reps', reps: 30 } },
    { exerciseId: 'arm-circles', sets: 1, prescription: { kind: 'time', seconds: 15 } },
    { exerciseId: 'shadow-boxing', sets: 1, prescription: { kind: 'time', seconds: 15 } },
  ],
};

/* ------------------------------------------------------------------------ */
/* 17. 12-Week Fat Destroyer – Upper A                                       */
/* ------------------------------------------------------------------------ */

export const FATDESTROYER_UPPER_A: WorkoutBlock = {
  id: 'fatdestroyer-upper-a',
  title: lz('Upper A', 'Upper A'),
  kind: 'main',
  restSeconds: 75,
  transitionSeconds: 45,
  exercises: [
    { exerciseId: 'incline-bench-press', sets: 3, prescription: { kind: 'reps', reps: 9 } },
    { exerciseId: 'one-arm-dumbbell-row', sets: 3, prescription: { kind: 'reps', reps: 11 } },
    { exerciseId: 'overhead-press', sets: 3, prescription: { kind: 'reps', reps: 9 } },
    { exerciseId: 'pull-up', sets: 3, prescription: { kind: 'reps', reps: 10 }, restSeconds: 90 },
    {
      exerciseId: 'skullcrusher',
      sets: 3,
      prescription: { kind: 'reps', reps: 11 },
      restSeconds: 60,
    },
    {
      exerciseId: 'bicep-curl',
      sets: 3,
      prescription: { kind: 'reps', reps: 11 },
      restSeconds: 60,
    },
  ],
};

/* ------------------------------------------------------------------------ */
/* 18. Core Destroyer – Ab Blasting Circuit                                  */
/* ------------------------------------------------------------------------ */

export const CORE_DESTROYER_ABC: WorkoutBlock = {
  id: 'core-destroyer-abc',
  title: lz('Ab Blasting Circuit', 'Ab Blasting Circuit'),
  kind: 'main',
  restSeconds: 10,
  transitionSeconds: 10,
  rounds: 3,
  exercises: [
    { exerciseId: 'crunch', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    { exerciseId: 'mountain-climber', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    { exerciseId: 'russian-twist', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    { exerciseId: 'leg-raise', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    { exerciseId: 'plank', sets: 1, prescription: { kind: 'time', seconds: 60 } },
  ],
};

/* ------------------------------------------------------------------------ */
/* 19. Kettlebell Ab & Core – full circuit                                   */
/* ------------------------------------------------------------------------ */

export const KB_CORE_CIRCUIT: WorkoutBlock = {
  id: 'kb-core-circuit',
  title: lz('KB-corecirkel', 'KB core circuit'),
  kind: 'main',
  restSeconds: 0,
  transitionSeconds: 15,
  rounds: 4,
  exercises: [
    { exerciseId: 'kettlebell-swing', sets: 1, prescription: { kind: 'reps', reps: 20 } },
    { exerciseId: 'lunge', sets: 1, prescription: { kind: 'reps', reps: 20 } },
    { exerciseId: 'shoulder-press', sets: 1, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'renegade-row', sets: 1, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'turkish-get-up', sets: 1, prescription: { kind: 'reps', reps: 6 } },
    { exerciseId: 'kb-figure-eight', sets: 1, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'dumbbell-pullover', sets: 1, prescription: { kind: 'reps', reps: 10 } },
    { exerciseId: 'russian-twist', sets: 1, prescription: { kind: 'reps', reps: 20 } },
  ],
};

/* ------------------------------------------------------------------------ */
/* 20. M&S 12-Week Women's – Legs & Glutes                                   */
/* ------------------------------------------------------------------------ */

export const WOMENS_LEGS_GLUTES: WorkoutBlock = {
  id: 'womens-legs-glutes',
  title: lz('Ben & setar', 'Legs & glutes'),
  kind: 'main',
  restSeconds: 75,
  transitionSeconds: 45,
  exercises: [
    { exerciseId: 'barbell-squat', sets: 3, prescription: { kind: 'reps', reps: 8 } },
    { exerciseId: 'lunge', sets: 3, prescription: { kind: 'reps', reps: 14 }, restSeconds: 60 },
    {
      exerciseId: 'dumbbell-step-up',
      sets: 3,
      prescription: { kind: 'reps', reps: 14 },
      restSeconds: 60,
    },
    {
      exerciseId: 'barbell-hip-thrust',
      sets: 3,
      prescription: { kind: 'reps', reps: 10 },
      restSeconds: 75,
    },
    {
      exerciseId: 'glute-bridge',
      sets: 2,
      prescription: { kind: 'reps', reps: 15 },
      restSeconds: 45,
    },
  ],
};
