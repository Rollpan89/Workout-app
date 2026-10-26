import type { Locale } from '../domain/localized';
import { formatKg } from '../load/load';
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
  /** Names the exercise and target before its optional how-to guidance. */
  readonly exerciseIntro: (exercise: string, target: string) => string;
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
  /** "Vila 45 sekunder." / "Vila en och en halv minut." – spoken once, when the rest starts. */
  readonly rest: (seconds: number) => string;
  /** Spoken when the rest is over – never counted down. */
  readonly restOver: string;
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
  /** Spoken once during a long timed hold ("10 kvar"). Rests never use this. */
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
  /** "60 kilo." / "60 kilos." Spoken before they lift. */
  readonly weight: (kg: number) => string;
  /** "Tjugo på varje sida." Plates are per side of a 20 kg bar. */
  readonly plates: (plates: readonly number[]) => string;
  readonly emptyBar: string;
  /** "Förra gången 60 kilo, 10 repetitioner." Reps of 0 omits the rep clause. */
  readonly lastTime: (kg: number, reps: number) => string;
  readonly loadUp: string;
  /** Isolation earned a smaller step than a base lift. */
  readonly loadUpSmall: string;
  /** Isolation was clean, but needs another clean session before the load moves. */
  readonly loadWait: string;
  readonly loadHold: string;
  readonly heavyNoted: string;
  readonly heavyCleared: string;
  readonly noWeight: string;
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

const MINUTES_SV = ['noll', 'en', 'två', 'tre', 'fyra', 'fem', 'sex'] as const;
const MINUTES_EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'] as const;

/**
 * How a rest length is spoken. Seconds are fine up to a minute, but
 * "90 sekunder" is awkward to listen to – whole minutes are said as minutes
 * and 90 s as "en och en halv minut". Everything else stays in seconds.
 *
 *   30 → "30 sekunder"      60 → "en minut"       90 → "en och en halv minut"
 *   45 → "45 sekunder"     120 → "två minuter"   150 → "150 sekunder"
 */
export function restDurationText(seconds: number, locale: Locale): string {
  const s = Math.max(0, Math.round(seconds));
  if (s === 90) return locale === 'sv' ? 'en och en halv minut' : 'one and a half minutes';
  if (s > 0 && s % 60 === 0) {
    const minutes = s / 60;
    if (locale === 'sv') {
      const word = MINUTES_SV[minutes] ?? String(minutes);
      return minutes === 1 ? `${word} minut` : `${word} minuter`;
    }
    const word = MINUTES_EN[minutes] ?? String(minutes);
    return minutes === 1 ? `${word} minute` : `${word} minutes`;
  }
  return locale === 'sv' ? `${s} sekunder` : `${s} seconds`;
}

function plateWord(kg: number, locale: Locale): string {
  if (locale === 'sv') {
    if (kg === 2.5) return 'två och en halv';
    if (kg === 1.25) return 'ett och ett kvarts';
    const n = Math.round(kg);
    return NUMBERS_SV[n] ?? String(n);
  }
  if (kg === 2.5) return 'two and a half';
  if (kg === 1.25) return 'one and a quarter';
  const n = Math.round(kg);
  return NUMBERS_EN[n] ?? String(n);
}

/** \"Tjugo och två och en halv på varje sida.\" */
export function platesText(plates: readonly number[], locale: Locale): string {
  const words = plates.map((plate) => plateWord(plate, locale));
  const joined =
    words.length <= 1
      ? (words[0] ?? '')
      : locale === 'sv'
        ? `${words.slice(0, -1).join(', ')} och ${words[words.length - 1]}`
        : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
  const sentence = locale === 'sv' ? `${joined} på varje sida.` : `${joined} on each side.`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

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
  exerciseIntro: (exercise, target) => `Nästa: ${exercise}. ${target}.`,
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
  rest: (seconds) => `Vila ${restDurationText(seconds, 'sv')}.`,
  restOver: 'Okej, vilan är över.',
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
  weight: (kg) => `${formatKg(kg, 'sv')} kilo.`,
  plates: (plates) => platesText(plates, 'sv'),
  emptyBar: 'Tom stång.',
  lastTime: (kg, reps) =>
    reps > 0
      ? `Förra gången ${formatKg(kg, 'sv')} kilo, ${reps} repetitioner.`
      : `Förra gången ${formatKg(kg, 'sv')} kilo.`,
  loadUp: 'Baslyft. Vi ökar.',
  loadUpSmall: 'Isolering. Liten ökning.',
  loadWait: 'Isolering. Samma vikt ett pass till.',
  loadHold: 'Vi behåller vikten.',
  heavyNoted: 'Noterat. Vi behåller vikten nästa gång.',
  heavyCleared: 'Okej. Nästa steg när seten sitter.',
  noWeight: 'Ingen vikt.',
  intensityLabels: SV_LABELS,
};

const en: CoachScript = {
  numbers: NUMBERS_EN,
  greeting: (name, workout) =>
    name ? `Hey ${name}! Time for ${workout}. I count, you move.` : `Time for ${workout}. I count, you move.`,
  welcomeBack: (step, total) => `Welcome back. We continue with step ${step} of ${total}.`,
  exerciseIntro: (exercise, target) => `Next: ${exercise}. ${target}.`,
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
  rest: (seconds) => `Rest for ${restDurationText(seconds, 'en')}.`,
  restOver: 'Alright, rest over.',
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
  weight: (kg) => `${formatKg(kg, 'en')} ${kg === 1 ? 'kilo' : 'kilos'}.`,
  plates: (plates) => platesText(plates, 'en'),
  emptyBar: 'Empty bar.',
  lastTime: (kg, reps) =>
    reps > 0
      ? `Last time ${formatKg(kg, 'en')} ${kg === 1 ? 'kilo' : 'kilos'}, ${reps} reps.`
      : `Last time ${formatKg(kg, 'en')} ${kg === 1 ? 'kilo' : 'kilos'}.`,
  loadUp: 'Base lift. Going up.',
  loadUpSmall: 'Isolation. Small increase.',
  loadWait: 'Isolation. Same weight one more time.',
  loadHold: 'Same weight.',
  heavyNoted: "Noted. We'll keep the weight next time.",
  heavyCleared: "Okay. Next step when the sets are solid.",
  noWeight: 'No weight.',
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
