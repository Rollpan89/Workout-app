import type { Locale } from '../domain/localized';
import type { IntensityLabelKey } from '../intensity/intensity';

/**
 * Everything the coach can say, per locale. Kept separate from the UI i18n
 * so that voice lines can be tuned for *listening* (short, rhythmic,
 * unambiguous when heard over gym noise).
 */
export interface CoachScript {
  readonly numbers: readonly string[]; // index 0..N
  readonly getReady: (exercise: string, target: string) => string;
  readonly nextUp: (exercise: string) => string;
  readonly repsTarget: (reps: number) => string;
  readonly timeTarget: (seconds: number) => string;
  readonly setOf: (set: number, total: number) => string;
  readonly go: string;
  readonly lastRep: string;
  readonly halfway: string;
  readonly setDone: string;
  readonly rest: (seconds: number) => string;
  readonly restEnding: string; // spoken at ~3 s left
  readonly restSkipped: string;
  readonly tapWhenReady: string;
  readonly paused: string;
  readonly resumed: string;
  readonly intensity: (label: IntensityLabelKey) => string;
  readonly finished: string;
  readonly aborted: string;
  readonly timeLeft: (seconds: number) => string;
  readonly motivation: readonly string[];
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
  getReady: (exercise, target) => `Nästa: ${exercise}. ${target}. Gör dig redo.`,
  nextUp: (exercise) => `Nästa övning: ${exercise}.`,
  repsTarget: (reps) => `${reps} repetitioner`,
  timeTarget: (seconds) => `${seconds} sekunder`,
  setOf: (set, total) => `Set ${set} av ${total}.`,
  go: 'Kör!',
  lastRep: 'Sista!',
  halfway: 'Halvvägs!',
  setDone: 'Bra jobbat.',
  rest: (seconds) => `Vila ${seconds} sekunder.`,
  restEnding: 'Gör dig redo.',
  restSkipped: 'Vi kör direkt.',
  tapWhenReady: 'Tryck när du är redo.',
  paused: 'Pausat.',
  resumed: 'Vi fortsätter.',
  intensity: (label) => `Intensitet: ${SV_LABELS[label]}.`,
  finished: 'Passet är klart. Grymt jobbat!',
  aborted: 'Passet avslutat.',
  timeLeft: (seconds) => `${seconds} kvar.`,
  motivation: [
    'Snyggt, håll tempot!',
    'Du äger det här!',
    'Fokus. Andas.',
    'Stark som tusan!',
    'Håll formen, det sitter!',
    'En till, du fixar det!',
  ],
  intensityLabels: SV_LABELS,
};

const en: CoachScript = {
  numbers: NUMBERS_EN,
  getReady: (exercise, target) => `Next: ${exercise}. ${target}. Get ready.`,
  nextUp: (exercise) => `Next exercise: ${exercise}.`,
  repsTarget: (reps) => `${reps} reps`,
  timeTarget: (seconds) => `${seconds} seconds`,
  setOf: (set, total) => `Set ${set} of ${total}.`,
  go: 'Go!',
  lastRep: 'Last one!',
  halfway: 'Halfway!',
  setDone: 'Nice work.',
  rest: (seconds) => `Rest ${seconds} seconds.`,
  restEnding: 'Get ready.',
  restSkipped: 'Straight in.',
  tapWhenReady: 'Tap when you are ready.',
  paused: 'Paused.',
  resumed: 'Let’s continue.',
  intensity: (label) => `Intensity: ${EN_LABELS[label]}.`,
  finished: 'Workout complete. Awesome job!',
  aborted: 'Workout ended.',
  timeLeft: (seconds) => `${seconds} to go.`,
  motivation: [
    'Nice, keep the pace!',
    'You own this!',
    'Focus. Breathe.',
    'Strong as hell!',
    'Hold the form, you’ve got it!',
    'One more, you can do it!',
  ],
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
