import type { Locale } from '../domain/localized';
import type { IntensityLabelKey } from '../intensity/intensity';

/**
 * Everything the coach can say, per locale. Kept separate from the UI i18n
 * so that voice lines can be tuned for *listening* (short, rhythmic,
 * unambiguous when heard over gym noise).
 */
export interface CoachScript {
  readonly numbers: readonly string[]; // index 0..N
  readonly greeting: (name: string | undefined, workout: string) => string;
  /** Session resumed after the app was killed: "Välkommen tillbaka…" */
  readonly welcomeBack: (step: number, totalSteps: number) => string;
  readonly getReady: (exercise: string, target: string) => string;
  readonly nextUp: (exercise: string) => string;
  readonly repsTarget: (reps: number) => string;
  readonly timeTarget: (seconds: number) => string;
  readonly setOf: (set: number, total: number) => string;
  readonly roundOf: (round: number, total: number) => string;
  readonly go: string;
  readonly lastRep: string;
  readonly lastTwo: string; // "two more"
  readonly halfway: string;
  readonly setDone: string;
  readonly setDoneVariants: readonly string[];
  readonly exerciseDone: (exercise: string) => string;
  readonly rest: (seconds: number) => string;
  readonly restEnding: string; // spoken at ~3 s left
  readonly restSkipped: string;
  readonly tapWhenReady: string;
  readonly paused: string;
  readonly resumed: string;
  /** After a pause/background gap: "Vi fortsätter. Set 2, rep 5 av 12." */
  readonly resumeAt: (set: number, totalSets: number, rep: number, totalReps: number) => string;
  /** Tempo changed by the user: slower / faster. */
  readonly tempoSlower: string;
  readonly tempoFaster: string;
  readonly intensity: (label: IntensityLabelKey) => string;
  readonly intensityUpReps: (reps: number) => string;
  readonly intensityDownReps: (reps: number) => string;
  readonly finished: string;
  readonly finishedWithName: (name: string) => string;
  readonly aborted: string;
  readonly timeLeft: (seconds: number) => string;
  readonly setsLeft: (sets: number) => string;
  readonly lastSet: string;
  readonly lastExercise: string;
  readonly blockStart: (block: string) => string;
  readonly breatheOut: string;
  readonly breatheIn: string;
  readonly holdCues: readonly string[]; // for isometric holds
  readonly motivation: readonly string[];
  readonly motivationEarly: readonly string[]; // first half of a set
  readonly motivationLate: readonly string[]; // last reps
  readonly motivationWithName: readonly ((name: string) => string)[];
  readonly restTalk: readonly string[]; // said during longer rests
  /** Before the rest starts: "Nästa: Armhävningar, 12 repetitioner." */
  readonly comingUp: (exercise: string, target: string) => string;
  /** Prefix for a technique tip during rest: "Tips inför armhävningar: …" */
  readonly tipFor: (exercise: string, tip: string) => string;
  /** Second/third tip in the same rest, no prefix needed. */
  readonly tipMore: (tip: string) => string;
  readonly intensityLabels: Readonly<Record<IntensityLabelKey, string>>;
}

const NUMBERS_SV = [
  'noll', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio',
  'elva', 'tolv', 'tretton', 'fjorton', 'femton', 'sexton', 'sjutton', 'arton', 'nitton', 'tjugo',
  'tjugoett', 'tjugotvå', 'tjugotre', 'tjugofyra', 'tjugofem', 'tjugosex', 'tjugosju', 'tjugoåtta', 'tjugonio', 'trettio',
];

const NUMBERS_EN = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
  'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five', 'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine', 'thirty',
];

const SV_LABELS: Record<IntensityLabelKey, string> = {
  light: 'lätt',
  easy: 'lugn',
  normal: 'normal',
  hard: 'hård',
  max: 'max',
};

const EN_LABELS: Record<IntensityLabelKey, string> = {
  light: 'light',
  easy: 'easy',
  normal: 'normal',
  hard: 'hard',
  max: 'max',
};

const sv: CoachScript = {
  numbers: NUMBERS_SV,
  greeting: (name, workout) =>
    name ? `Hej ${name}! Dags för ${workout}. Jag räknar, du kör.` : `Dags för ${workout}. Jag räknar, du kör.`,
  welcomeBack: (step, total) => `Välkommen tillbaka. Vi fortsätter med steg ${step} av ${total}.`,
  getReady: (exercise, target) => `Nästa: ${exercise}. ${target}. Gör dig redo.`,
  nextUp: (exercise) => `Nästa övning: ${exercise}.`,
  repsTarget: (reps) => `${reps} repetitioner`,
  timeTarget: (seconds) => `${seconds} sekunder`,
  setOf: (set, total) => `Set ${set} av ${total}.`,
  roundOf: (round, total) => `Varv ${round} av ${total}.`,
  go: 'Kör!',
  lastRep: 'Sista!',
  lastTwo: 'Två kvar!',
  halfway: 'Halvvägs!',
  setDone: 'Bra jobbat.',
  setDoneVariants: ['Bra jobbat.', 'Snyggt!', 'Så ska det se ut.', 'Grymt.', 'Där satt den.'],
  exerciseDone: (exercise) => `${exercise} klart.`,
  rest: (seconds) => `Vila ${seconds} sekunder.`,
  restEnding: 'Gör dig redo.',
  restSkipped: 'Vi kör direkt.',
  tapWhenReady: 'Tryck när du är redo.',
  paused: 'Pausat.',
  resumed: 'Vi fortsätter.',
  resumeAt: (set, totalSets, rep, totalReps) =>
    totalSets > 1 ? `Vi fortsätter. Set ${set} av ${totalSets}, rep ${rep} av ${totalReps}.` : `Vi fortsätter. Rep ${rep} av ${totalReps}.`,
  tempoSlower: 'Lugnare tempo.',
  tempoFaster: 'Snabbare tempo.',
  intensity: (label) => `Intensitet: ${SV_LABELS[label]}.`,
  intensityUpReps: (reps) => `Vi ökar. ${reps} repetitioner nu.`,
  intensityDownReps: (reps) => `Vi lugnar ner det. ${reps} repetitioner räcker.`,
  finished: 'Passet är klart. Grymt jobbat!',
  finishedWithName: (name) => `Passet är klart. Grymt jobbat, ${name}!`,
  aborted: 'Passet avslutat.',
  timeLeft: (seconds) => `${seconds} kvar.`,
  setsLeft: (sets) => (sets === 1 ? 'Ett set kvar.' : `${sets} set kvar.`),
  lastSet: 'Sista setet. Ge allt!',
  lastExercise: 'Sista övningen. Nu avslutar vi starkt.',
  blockStart: (block) => `Nu börjar ${block}.`,
  breatheOut: 'Andas ut.',
  breatheIn: 'Andas in.',
  holdCues: ['Håll kvar.', 'Andas lugnt.', 'Spänn magen.', 'Stark position.', 'Du står stadigt.'],
  motivation: [
    'Snyggt, håll tempot!',
    'Du äger det här!',
    'Fokus. Andas.',
    'Stark som tusan!',
    'Håll formen, det sitter!',
  ],
  motivationEarly: ['Bra tempo.', 'Kontrollerat.', 'Snygg form.', 'Precis så.'],
  motivationLate: ['Kom igen nu!', 'Du fixar det!', 'Pressa på!', 'Nästan där!', 'Ge allt!'],
  motivationWithName: [
    (name) => `Kom igen ${name}!`,
    (name) => `Starkt ${name}!`,
    (name) => `Det här är ditt, ${name}.`,
  ],
  restTalk: [
    'Skaka loss. Andas djupt.',
    'Ta några djupa andetag.',
    'Bra. Sänk axlarna, andas.',
    'Drick lite vatten om du behöver.',
  ],
  comingUp: (exercise, target) => `Nästa: ${exercise}, ${target}.`,
  tipFor: (exercise, tip) => `Tips inför ${exercise.toLowerCase()}: ${tip}`,
  tipMore: (tip) => `Och: ${tip}`,
  intensityLabels: SV_LABELS,
};

const en: CoachScript = {
  numbers: NUMBERS_EN,
  greeting: (name, workout) =>
    name ? `Hey ${name}! Time for ${workout}. I count, you move.` : `Time for ${workout}. I count, you move.`,
  welcomeBack: (step, total) => `Welcome back. We continue with step ${step} of ${total}.`,
  getReady: (exercise, target) => `Next: ${exercise}. ${target}. Get ready.`,
  nextUp: (exercise) => `Next exercise: ${exercise}.`,
  repsTarget: (reps) => `${reps} reps`,
  timeTarget: (seconds) => `${seconds} seconds`,
  setOf: (set, total) => `Set ${set} of ${total}.`,
  roundOf: (round, total) => `Round ${round} of ${total}.`,
  go: 'Go!',
  lastRep: 'Last one!',
  lastTwo: 'Two more!',
  halfway: 'Halfway!',
  setDone: 'Nice work.',
  setDoneVariants: ['Nice work.', 'Clean!', 'That’s how it’s done.', 'Strong.', 'Nailed it.'],
  exerciseDone: (exercise) => `${exercise} done.`,
  rest: (seconds) => `Rest ${seconds} seconds.`,
  restEnding: 'Get ready.',
  restSkipped: 'Straight in.',
  tapWhenReady: 'Tap when you are ready.',
  paused: 'Paused.',
  resumed: 'Let’s continue.',
  resumeAt: (set, totalSets, rep, totalReps) =>
    totalSets > 1 ? `Let’s continue. Set ${set} of ${totalSets}, rep ${rep} of ${totalReps}.` : `Let’s continue. Rep ${rep} of ${totalReps}.`,
  tempoSlower: 'Slower tempo.',
  tempoFaster: 'Faster tempo.',
  intensity: (label) => `Intensity: ${EN_LABELS[label]}.`,
  intensityUpReps: (reps) => `Stepping up. ${reps} reps now.`,
  intensityDownReps: (reps) => `Easing off. ${reps} reps will do.`,
  finished: 'Workout complete. Awesome job!',
  finishedWithName: (name) => `Workout complete. Awesome job, ${name}!`,
  aborted: 'Workout ended.',
  timeLeft: (seconds) => `${seconds} to go.`,
  setsLeft: (sets) => (sets === 1 ? 'One set left.' : `${sets} sets left.`),
  lastSet: 'Last set. Give it everything!',
  lastExercise: 'Last exercise. Let’s finish strong.',
  blockStart: (block) => `Starting ${block}.`,
  breatheOut: 'Breathe out.',
  breatheIn: 'Breathe in.',
  holdCues: ['Hold it.', 'Breathe steady.', 'Brace the core.', 'Strong position.', 'You’re solid.'],
  motivation: [
    'Nice, keep the pace!',
    'You own this!',
    'Focus. Breathe.',
    'Strong as hell!',
    'Hold the form, you’ve got it!',
  ],
  motivationEarly: ['Good tempo.', 'Controlled.', 'Clean form.', 'Just like that.'],
  motivationLate: ['Come on!', 'You’ve got this!', 'Push!', 'Almost there!', 'Everything you’ve got!'],
  motivationWithName: [
    (name) => `Come on ${name}!`,
    (name) => `Strong, ${name}!`,
    (name) => `This one’s yours, ${name}.`,
  ],
  restTalk: [
    'Shake it out. Deep breaths.',
    'Take a few deep breaths.',
    'Good. Drop the shoulders, breathe.',
    'Grab some water if you need it.',
  ],
  comingUp: (exercise, target) => `Coming up: ${exercise}, ${target}.`,
  tipFor: (exercise, tip) => `Tip for ${exercise.toLowerCase()}: ${tip}`,
  tipMore: (tip) => `Also: ${tip}`,
  intensityLabels: EN_LABELS,
};

export const COACH_SCRIPTS: Readonly<Record<Locale, CoachScript>> = { sv, en };

export function getCoachScript(locale: Locale): CoachScript {
  return COACH_SCRIPTS[locale] ?? sv;
}

/** Spell out small numbers so the TTS delivers them crisply; fall back to digits. */
export function spokenNumber(script: CoachScript, n: number): string {
  return script.numbers[n] ?? String(n);
}
