import { lz, type Workout } from '@/core/domain';
import {
  BODYWEIGHT_FULL,
  COOLDOWN_STRETCH,
  CORE_CRUSHER,
  FINISHER_BURN,
  HIIT_CIRCUIT,
  KETTLEBELL_ENGINE,
  LOWER_BODY_STRENGTH,
  MOBILITY_FLOW,
  UPPER_BODY_STRENGTH,
  WARMUP_DYNAMIC,
  WARMUP_SHORT,
} from './blocks';

/**
 * The workout library. Every program is an ordered list of reusable blocks.
 * To add a program: compose blocks, give it metadata, done.
 */
export const WORKOUTS: readonly Workout[] = [
  {
    id: 'full-body-blast',
    title: lz('Full Body Blast', 'Full Body Blast'),
    tagline: lz('Hela kroppen. Ingen utrustning.', 'Whole body. No equipment.'),
    description: lz(
      'Ett komplett helkroppspass med enbart kroppsvikt. Perfekt hemma eller på resande fot.',
      'A complete full-body session using only your bodyweight. Perfect at home or on the road.',
    ),
    goal: 'endurance',
    difficulty: 'beginner',
    equipment: ['none'],
    primaryMuscles: ['quads', 'chest', 'glutes', 'core'],
    blocks: [WARMUP_DYNAMIC, BODYWEIGHT_FULL, COOLDOWN_STRETCH],
    estimatedMinutes: 28,
    accent: 'red',
  },
  {
    id: 'lower-power',
    title: lz('Lower Power', 'Lower Power'),
    tagline: lz('Benstyrka som märks.', 'Leg strength you can feel.'),
    description: lz(
      'Tunga underkroppsövningar med hantlar eller kettlebell. Fokus på knäböj och höftgångjärn.',
      'Heavy lower-body work with dumbbells or a kettlebell. Focus on squat and hip hinge patterns.',
    ),
    goal: 'strength',
    difficulty: 'intermediate',
    equipment: ['dumbbells', 'kettlebell'],
    primaryMuscles: ['quads', 'glutes', 'hamstrings'],
    blocks: [WARMUP_DYNAMIC, LOWER_BODY_STRENGTH, COOLDOWN_STRETCH],
    estimatedMinutes: 38,
    accent: 'orange',
  },
  {
    id: 'upper-armour',
    title: lz('Upper Armour', 'Upper Armour'),
    tagline: lz('Bröst, rygg, axlar, armar.', 'Chest, back, shoulders, arms.'),
    description: lz(
      'Klassisk överkroppsdag med hantlar och bänk. Bygg en stark och balanserad överkropp.',
      'Classic upper-body day with dumbbells and a bench. Build a strong, balanced upper body.',
    ),
    goal: 'hypertrophy',
    difficulty: 'intermediate',
    equipment: ['dumbbells', 'bench'],
    primaryMuscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    blocks: [WARMUP_SHORT, UPPER_BODY_STRENGTH, COOLDOWN_STRETCH],
    estimatedMinutes: 40,
    accent: 'violet',
  },
  {
    id: 'hiit-inferno',
    title: lz('HIIT Inferno', 'HIIT Inferno'),
    tagline: lz('20 minuter. Maxpuls.', '20 minutes. Max heart rate.'),
    description: lz(
      'Tre varv explosiv intervallträning följt av en brutal finisher. Kort, hårt, effektivt.',
      'Three rounds of explosive intervals followed by a brutal finisher. Short, hard, effective.',
    ),
    goal: 'fatLoss',
    difficulty: 'advanced',
    equipment: ['none'],
    primaryMuscles: ['fullBody', 'quads', 'core'],
    blocks: [WARMUP_SHORT, HIIT_CIRCUIT, FINISHER_BURN, COOLDOWN_STRETCH],
    estimatedMinutes: 22,
    accent: 'magenta',
  },
  {
    id: 'core-crusher',
    title: lz('Core Crusher', 'Core Crusher'),
    tagline: lz('Stålmage på 15 minuter.', 'Abs of steel in 15 minutes.'),
    description: lz(
      'Två varv riktad bålträning. Passar som fristående pass eller som tillägg efter cardio.',
      'Two rounds of targeted core work. Works standalone or as an add-on after cardio.',
    ),
    goal: 'strength',
    difficulty: 'beginner',
    equipment: ['none'],
    primaryMuscles: ['core'],
    blocks: [WARMUP_SHORT, CORE_CRUSHER],
    estimatedMinutes: 15,
    accent: 'yellow',
  },
  {
    id: 'kettlebell-engine',
    title: lz('Kettlebell Engine', 'Kettlebell Engine'),
    tagline: lz('En kula. Fyra varv. Allt.', 'One bell. Four rounds. Everything.'),
    description: lz(
      'Kraft och kondition i ett. Swing, goblet squat och armhävningar i fyra intensiva varv.',
      'Power and conditioning in one. Swings, goblet squats and push-ups across four intense rounds.',
    ),
    goal: 'endurance',
    difficulty: 'intermediate',
    equipment: ['kettlebell'],
    primaryMuscles: ['glutes', 'hamstrings', 'quads', 'chest'],
    blocks: [WARMUP_DYNAMIC, KETTLEBELL_ENGINE, COOLDOWN_STRETCH],
    estimatedMinutes: 30,
    accent: 'cyan',
  },
  {
    id: 'mobility-reset',
    title: lz('Mobility Reset', 'Mobility Reset'),
    tagline: lz('Återhämta. Rör dig fritt.', 'Recover. Move freely.'),
    description: lz(
      'Lugnt rörlighetsflöde för vilodagar eller efter hårda pass. Ingen puls, bara rörelse.',
      'A calm mobility flow for rest days or after hard sessions. No heart rate, just movement.',
    ),
    goal: 'mobility',
    difficulty: 'beginner',
    equipment: ['none'],
    primaryMuscles: ['back', 'hamstrings', 'glutes'],
    blocks: [MOBILITY_FLOW],
    estimatedMinutes: 12,
    accent: 'lime',
  },
];

export function getWorkout(id: string): Workout | undefined {
  return WORKOUTS.find((w) => w.id === id);
}
