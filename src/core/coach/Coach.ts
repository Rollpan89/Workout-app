import { resolveLocalized, SPEECH_LANGUAGE_TAG, type Locale } from '../domain/localized';
import { effectiveVoiceParams, type VoiceSettings } from '../domain/settings';
import type { SessionEngine } from '../engine/SessionEngine';
import type { PlanStep, SessionSnapshot } from '../engine/types';
import { intensityLabelKey, resolvePrescription } from '../intensity/intensity';
import type { Unsubscribe } from '../utils/emitter';
import { getCoachScript, spokenNumber, type CoachScript } from './script';
import type { SpeechPort, SpeechUtterance } from './SpeechPort';

export interface CoachOptions {
  readonly speech: SpeechPort;
  readonly locale: Locale;
  readonly voice: VoiceSettings;
  /** User's display name for personal lines; empty/undefined = generic. */
  readonly userName?: string;
  /** Optional haptic hook, fired on each rep and at phase changes. */
  readonly haptic?: (kind: 'rep' | 'go' | 'done' | 'warn') => void;
  /** Injectable randomness (tests pass a constant). */
  readonly random?: () => number;
}

/** Exercises with a cadence at or above this get "ner… upp" tempo words. */
const TEMPO_CUE_MIN_SECONDS_PER_REP = 3;
/** Minimum reps in a set before the coach starts talking between numbers. */
const MIN_REPS_FOR_CHATTER = 6;
/** Don't repeat a free-standing motivational line more often than this. */
const MOTIVATION_COOLDOWN_MS = 40_000;

/**
 * Coach
 * -----
 * Subscribes to SessionEngine events and turns them into speech. It is the
 * single place that decides *what* is said and *when* – the engine knows
 * nothing about audio, and the speech port knows nothing about workouts.
 *
 * Involvement model for a rep-based set (all numbers are `interrupt`, so the
 * count is never late; everything else is `queue`/`drop` and yields to it):
 *
 *   ┌─ "Set 2 av 3." "Kör!"
 *   ├─ 1 … first half   → technique cue after every 3rd rep ("Knäna utåt.")
 *   │                     slow lifts: tempo word between numbers ("ner")
 *   ├─ halfway          → "Halvvägs!" + short early-phase praise
 *   ├─ second half      → motivational push, sometimes with the user's name
 *   ├─ "Två kvar!" "Sista!"
 *   └─ praise (varied) → "Ett set kvar." / "Nästa övning: …" → rest talk
 *
 * Time-based holds get periodic hold cues and breathing reminders instead.
 * The tempo word is scheduled on the engine clock (via `snapshot` ticks), so
 * it stays deterministic and pauses with the session.
 */
export class Coach {
  private speech: SpeechPort;
  private locale: Locale;
  private voice: VoiceSettings;
  private userName?: string;
  private script: CoachScript;
  private readonly haptic?: CoachOptions['haptic'];
  private readonly random: () => number;
  private subscriptions: Unsubscribe[] = [];
  private planSteps: readonly PlanStep[] = [];
  private lastMotivationAt = -Infinity;
  private techniqueCueIndex = -1;
  private lastPraiseIndex = -1;
  private lastLateMotivationIndex = -1;
  /** Pending tempo word: spoken once `workElapsedSeconds` passes `dueAt`. */
  private pendingTempo?: { word: string; dueAt: number; stepIndex: number };
  /** Greeting waiting to be merged into the first exercise announcement. */
  private pendingGreeting?: string;
  private resumedAt: number | undefined;
  /** Tips for the upcoming exercise, scheduled at specific rest-seconds-remaining marks. */
  private restTips: { at: number; text: string }[] = [];
  /** Exercise id that was already introduced right before the current rest (skip re-announce). */
  private announcedNextId?: string;

  constructor(options: CoachOptions) {
    this.speech = options.speech;
    this.locale = options.locale;
    this.voice = options.voice;
    this.userName = normaliseName(options.userName);
    this.script = getCoachScript(options.locale);
    this.haptic = options.haptic;
    this.random = options.random ?? Math.random;
  }

  attach(engine: SessionEngine): void {
    this.detach();
    const { events } = engine;

    this.subscriptions.push(
      events.on('started', ({ plan }) => {
        this.planSteps = plan.steps;
        this.techniqueCueIndex = -1;
        this.lastMotivationAt = -Infinity;
        // Spoken together with the first announcement (see below) so the
        // intro can't be cut off by the countdown if the TTS is slow.
        this.pendingGreeting = this.script.greeting(this.userName, resolveLocalized(plan.workout.title, this.locale));
      }),

      events.on('restored', ({ step }) => {
        // Replaces the normal greeting: "Välkommen tillbaka. Vi fortsätter med steg 5 av 12."
        this.pendingGreeting = this.script.welcomeBack(step.index + 1, this.planSteps.length);
        this.resumedAt = step.index;
      }),

      events.on('exerciseAnnounced', ({ step, target }) => {
        const name = this.exerciseName(step);
        const targetText =
          target.kind === 'reps'
            ? this.script.repsTarget(target.reps)
            : this.script.timeTarget(target.seconds);

        // After a restore we re-enter mid-plan: the greeting says where we
        // are, so skip the block/round intro that belongs to the step before.
        const prev = this.resumedAt === step.index ? undefined : this.planSteps[step.index - 1];
        this.resumedAt = undefined;
        const isNewBlock = prev !== undefined && prev.block.id !== step.block.id;
        const isNewRound = prev !== undefined && prev.block.id === step.block.id && prev.round !== step.round;

        if (isNewBlock) this.say(this.script.blockStart(resolveLocalized(step.block.title, this.locale)), 'queue');
        if (isNewRound && step.rounds > 1) this.say(this.script.roundOf(step.round, step.rounds), 'queue');
        if (this.isLastExercise(step) && this.planSteps.length > 1) this.say(this.script.lastExercise, 'queue');

        const intro = this.script.getReady(name, targetText);
        if (this.pendingGreeting) {
          this.say(`${this.pendingGreeting} ${intro}`, 'interrupt');
          this.pendingGreeting = undefined;
        } else {
          // Block/round lines were just queued – don't cut them off.
          this.say(intro, isNewBlock || isNewRound ? 'queue' : 'interrupt');
        }
        if (step.totalSets > 1) this.say(this.script.setOf(step.setNumber, step.totalSets), 'queue');
        const cue = step.exercise.cue;
        if (cue) this.say(resolveLocalized(cue, this.locale), 'queue');
      }),

      events.on('countdownTick', ({ remaining }) => {
        this.say(spokenNumber(this.script, remaining), 'interrupt');
      }),

      events.on('awaitingUser', ({ step }) => {
        if (step.totalSets > 1) {
          this.say(this.script.setOf(step.setNumber, step.totalSets), 'interrupt');
          if (step.setNumber === step.totalSets) this.say(this.script.lastSet, 'queue');
          this.say(this.script.tapWhenReady, 'queue');
        } else {
          this.say(this.script.tapWhenReady, 'interrupt');
        }
      }),

      events.on('setStarted', ({ step, target }) => {
        this.haptic?.('go');
        this.pendingTempo = undefined;
        this.techniqueCueIndex = -1;
        const isLastSet = step.totalSets > 1 && step.setNumber === step.totalSets;
        const announcedAlready = engine.snapshot.interactionLevel !== 'handsFree' || step.setNumber === 1;

        if (!announcedAlready) {
          // Hands-free, set 2+: the engine skips the announcement, so we say it here.
          this.say(this.script.setOf(step.setNumber, step.totalSets), 'interrupt');
          if (isLastSet) this.say(this.script.lastSet, 'queue');
          this.say(this.script.go, 'queue');
        } else {
          this.say(this.script.go, 'interrupt');
        }
        if (target.kind === 'time' && target.seconds >= 20) this.say(this.script.breatheIn, 'drop');
      }),

      events.on('rep', ({ step, rep, total }) => {
        this.haptic?.('rep');
        this.pendingTempo = undefined;

        if (rep === total && total > 1) {
          this.say(this.script.lastRep, 'interrupt');
          return;
        }
        if (rep === total - 1 && total >= MIN_REPS_FOR_CHATTER) {
          this.say(this.script.lastTwo, 'interrupt');
          return;
        }

        const speakNumber = this.voice.countEveryRep || rep % 5 === 0 || rep === 1;
        if (speakNumber) this.say(spokenNumber(this.script, rep), 'interrupt');

        if (total < MIN_REPS_FOR_CHATTER) return; // short sets: just count
        const earlyPhase = rep <= Math.ceil(total / 2);
        const cadence = step.exercise.secondsPerRep;

        if (earlyPhase && this.voice.techniqueCues && rep % 3 === 0) {
          const cue = this.nextTechniqueCue(step);
          if (cue) this.say(cue, 'queue');
          return;
        }
        // Push on the 2nd rep after halfway (and every 3rd after that) – leaves air after "Halvvägs!".
        if (!earlyPhase && rep < total - 2 && this.voice.motivation && (rep - Math.ceil(total / 2)) % 3 === 2) {
          this.say(this.pickLateMotivation(), 'queue');
          return;
        }
        if (this.voice.tempoCues && cadence >= TEMPO_CUE_MIN_SECONDS_PER_REP && step.exercise.instructions?.tempo) {
          // Eccentric word halfway through the rep window, on the engine clock.
          const word = resolveLocalized(step.exercise.instructions.tempo.down, this.locale);
          this.pendingTempo = {
            word,
            dueAt: engine.snapshot.workElapsedSeconds + cadence / 2,
            stepIndex: step.index,
          };
        }
      }),

      events.on('snapshot', (snapshot) => this.onSnapshot(snapshot)),

      events.on('workTick', ({ step, elapsed, total }) => {
        const remaining = total - elapsed;
        if (remaining > 0 && remaining <= 3) {
          this.say(spokenNumber(this.script, remaining), 'interrupt');
          return;
        }
        if (remaining === 10 && total >= 20) {
          this.say(this.script.timeLeft(10), 'drop');
          return;
        }
        // Long holds: a hold/technique cue every 8 s, a breathing reminder in between.
        if (total >= 20 && elapsed > 0 && remaining > 5) {
          if (elapsed % 8 === 0) {
            const cue = this.voice.techniqueCues ? this.nextTechniqueCue(step) : undefined;
            this.say(cue ?? this.pickFrom(this.script.holdCues), 'drop');
          } else if (elapsed % 8 === 4 && this.voice.techniqueCues) {
            this.say(elapsed % 16 === 4 ? this.script.breatheOut : this.script.breatheIn, 'drop');
          }
        }
      }),

      events.on('halfway', ({ step }) => {
        this.say(this.script.halfway, 'queue');
        if (this.voice.motivation && step.exercise.category !== 'mobility') {
          this.say(this.pickFrom(this.script.motivationEarly), 'drop');
        }
      }),

      events.on('setCompleted', ({ step }) => {
        this.haptic?.('done');
        this.pendingTempo = undefined;
        this.announcedNextId = undefined;
        this.say(this.nextPraise(), 'interrupt');
        if (step.isLastSetOfExercise && step.totalSets > 1) {
          this.say(this.script.exerciseDone(this.exerciseName(step)), 'queue');
        }
        // Announce what comes next *before* the rest countdown starts, so the
        // user can already move to the right spot / grab equipment.
        const next = this.planSteps[step.index + 1];
        if (this.voice.announceNext && next && next.exercise.id !== step.exercise.id) {
          const target = resolvePrescription(next.workoutExercise.prescription, engine.snapshot.intensity);
          const targetText = target.kind === 'reps' ? this.script.repsTarget(target.reps) : this.script.timeTarget(target.seconds);
          this.say(this.script.comingUp(this.exerciseName(next), targetText), 'queue');
          this.announcedNextId = next.exercise.id;
        }
      }),

      events.on('restStarted', ({ seconds, nextStep, step }) => {
        this.say(this.script.rest(seconds), 'queue');
        this.restTips = [];
        if (nextStep) {
          if (nextStep.exercise.id !== step.exercise.id) {
            if (this.announcedNextId !== nextStep.exercise.id) {
              this.say(this.script.nextUp(this.exerciseName(nextStep)), 'queue');
            }
            this.scheduleRestTips(nextStep, seconds);
          } else {
            const left = step.totalSets - step.setNumber;
            if (left > 0) this.say(this.script.setsLeft(left), 'queue');
          }
        }
        // Motivation only when the rest isn't already filled with tips
        if (this.restTips.length === 0) {
          if (seconds >= 30) this.maybeRestTalk(engine.snapshot.sessionElapsedSeconds);
          else this.maybeMotivate(engine.snapshot.sessionElapsedSeconds);
        }
      }),

      events.on('restTick', ({ remaining, total }) => {
        if (remaining === 3 && total > 5) {
          this.say(this.script.restEnding, 'interrupt');
          return;
        }
        if (remaining <= 2 && remaining >= 1) {
          this.say(spokenNumber(this.script, remaining), 'interrupt');
          return;
        }
        const tip = this.restTips.find((t) => t.at === remaining);
        if (tip) {
          this.restTips = this.restTips.filter((t) => t !== tip);
          this.say(tip.text, 'queue');
          return;
        }
        if (remaining === 10 && total >= 30) {
          this.say(this.script.timeLeft(10), 'drop');
        }
      }),

      events.on('intensityChanged', ({ from, to }) => {
        this.haptic?.('warn');
        const snap = engine.snapshot;
        const level = this.script.intensity(intensityLabelKey(to));
        // While a rep set is active, also tell the user what the change *means*
        // – in the same utterance so an interrupt can't split them.
        if (snap.target?.kind === 'reps' && (snap.phase === 'working' || snap.phase === 'awaitingStart')) {
          const meaning =
            to > from
              ? this.script.intensityUpReps(snap.target.reps)
              : this.script.intensityDownReps(snap.target.reps);
          this.say(`${level} ${meaning}`, 'interrupt');
        } else {
          this.say(level, 'interrupt');
        }
      }),

      events.on('paused', () => {
        this.pendingTempo = undefined;
        this.speech.stop();
        this.say(this.script.paused, 'interrupt');
      }),

      events.on('resumed', () => {
        const snap = engine.snapshot;
        const step = snap.step;
        if (snap.phase === 'working' && snap.target?.kind === 'reps' && step && snap.repsDone > 0) {
          // Tell the user where we are so they can pick the count back up.
          this.say(this.script.resumeAt(step.setNumber, step.totalSets, snap.repsDone + 1, snap.target.reps), 'interrupt');
        } else {
          this.say(this.script.resumed, 'interrupt');
        }
      }),

      events.on('gapSkipped', () => {
        const snap = engine.snapshot;
        const step = snap.step;
        if (snap.target?.kind === 'reps' && step) {
          this.say(this.script.resumeAt(step.setNumber, step.totalSets, snap.repsDone + 1, snap.target.reps), 'interrupt');
        }
      }),

      events.on('tempoChanged', ({ from, to }) => {
        // Short confirmation, spoken right away (a queued line would land
        // several reps late behind the count).
        this.say(to > from ? this.script.tempoSlower : this.script.tempoFaster, 'interrupt');
      }),

      events.on('finished', ({ completed }) => {
        this.haptic?.('done');
        this.pendingTempo = undefined;
        if (!completed) {
          this.say(this.script.aborted, 'interrupt');
          return;
        }
        this.say(this.userName ? this.script.finishedWithName(this.userName) : this.script.finished, 'interrupt');
      }),
    );
  }

  detach(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];
    this.pendingTempo = undefined;
    this.pendingGreeting = undefined;
    this.restTips = [];
    this.announcedNextId = undefined;
    this.planSteps = [];
    this.speech.stop();
  }

  updateSettings(locale: Locale, voice: VoiceSettings, userName?: string): void {
    this.locale = locale;
    this.voice = voice;
    if (userName !== undefined) this.userName = normaliseName(userName);
    this.script = getCoachScript(locale);
  }

  setSpeech(speech: SpeechPort): void {
    this.speech.stop();
    this.speech = speech;
  }

  /* ------------------------------------------------------------------ */

  private onSnapshot(snapshot: SessionSnapshot): void {
    const pending = this.pendingTempo;
    if (!pending) return;
    if (snapshot.phase !== 'working' || snapshot.stepIndex !== pending.stepIndex) {
      this.pendingTempo = undefined;
      return;
    }
    if (snapshot.workElapsedSeconds >= pending.dueAt) {
      this.pendingTempo = undefined;
      this.say(pending.word, 'drop');
    }
  }

  private say(text: string, priority: SpeechUtterance['priority']): void {
    if (!this.voice.enabled) return;
    const { rate, pitch } = effectiveVoiceParams(this.voice);
    this.speech.speak({
      text,
      language: SPEECH_LANGUAGE_TAG[this.locale],
      rate,
      pitch,
      priority,
    });
  }

  private exerciseName(step: PlanStep): string {
    return resolveLocalized(step.exercise.name, this.locale);
  }

  /**
   * Plan technique tips for the upcoming exercise across the rest.
   *  - 'one'  → the exercise's key cue (or first coach cue) a few seconds in
   *  - 'full' → key cue + up to two more coach cues, spread over the rest
   * Nothing is scheduled for rests shorter than 8 s (no room to listen).
   */
  private scheduleRestTips(next: PlanStep, restSeconds: number): void {
    if (this.voice.restTips === 'off' || restSeconds < 8) return;
    const name = this.exerciseName(next);
    const pool: string[] = [];
    const seen = new Set<string>();
    const push = (text: string | undefined) => {
      if (!text || seen.has(text)) return;
      seen.add(text);
      pool.push(text);
    };
    if (next.exercise.cue) push(resolveLocalized(next.exercise.cue, this.locale));
    for (const cue of next.exercise.instructions?.coachCues ?? []) push(resolveLocalized(cue, this.locale));
    if (pool.length === 0) return;

    // 'full' = up to three tips, but only when there is room to listen:
    // three lines in a 20 s rest (plus "Nästa:", "Vila", "Gör dig redo" and
    // the countdown) is a wall of talk, so short rests degrade to two/one.
    const maxTips = restSeconds >= 45 ? 3 : restSeconds >= 20 ? 2 : 1;
    const count = this.voice.restTips === 'full' ? Math.min(maxTips, pool.length) : 1;
    // First tip after the announcements have had time to play; the rest spread
    // evenly, always leaving the last 5 s for "Gör dig redo" + countdown.
    const first = Math.max(5, restSeconds - Math.min(6, Math.floor(restSeconds / 3)));
    const last = 6;
    this.restTips = pool.slice(0, count).map((tip, i) => {
      let at = count === 1 ? first : Math.round(first - ((first - last) * i) / (count - 1));
      if (at === 10 && restSeconds >= 30) at = 11; // keep the "10 s left" call-out free
      return { at, text: i === 0 ? this.script.tipFor(name, tip) : this.script.tipMore(tip) };
    });
    // De-duplicate marks that collapsed onto the same second on very short rests
    const marks = new Set<number>();
    this.restTips = this.restTips.filter((t) => (marks.has(t.at) ? false : (marks.add(t.at), true)));
  }

  /** True when every remaining step belongs to the same exercise as `step`. */
  private isLastExercise(step: PlanStep): boolean {
    if (step.setNumber !== 1) return false;
    return this.planSteps
      .slice(step.index + 1)
      .every((s) => s.exercise.id === step.exercise.id && s.block.id === step.block.id && s.round === step.round);
  }

  /** Rotates through the exercise's technique cues, falling back to its main cue. */
  private nextTechniqueCue(step: PlanStep): string | undefined {
    const cues = step.exercise.instructions?.coachCues;
    if (cues && cues.length > 0) {
      this.techniqueCueIndex = (this.techniqueCueIndex + 1) % cues.length;
      const cue = cues[this.techniqueCueIndex];
      return cue ? resolveLocalized(cue, this.locale) : undefined;
    }
    return step.exercise.cue ? resolveLocalized(step.exercise.cue, this.locale) : undefined;
  }

  private nextPraise(): string {
    const variants = this.script.setDoneVariants;
    let idx = Math.floor(this.random() * variants.length) % variants.length;
    if (idx === this.lastPraiseIndex) idx = (idx + 1) % variants.length;
    this.lastPraiseIndex = idx;
    return variants[idx] ?? this.script.setDone;
  }

  private pickFrom<T>(items: readonly T[]): T {
    return items[Math.floor(this.random() * items.length) % items.length] as T;
  }

  private pickLateMotivation(): string {
    if (this.userName && this.random() < 0.4) {
      return this.pickFrom(this.script.motivationWithName)(this.userName);
    }
    const lines = this.script.motivationLate;
    let idx = Math.floor(this.random() * lines.length) % lines.length;
    if (idx === this.lastLateMotivationIndex) idx = (idx + 1) % lines.length;
    this.lastLateMotivationIndex = idx;
    return lines[idx] ?? '';
  }

  private maybeMotivate(sessionElapsedSeconds: number): void {
    if (!this.voice.motivation) return;
    const now = sessionElapsedSeconds * 1000;
    if (now - this.lastMotivationAt < MOTIVATION_COOLDOWN_MS || this.random() < 0.5) return;
    this.lastMotivationAt = now;
    this.say(this.pickFrom(this.script.motivation), 'drop');
  }

  private maybeRestTalk(sessionElapsedSeconds: number): void {
    if (!this.voice.motivation) return;
    const now = sessionElapsedSeconds * 1000;
    if (now - this.lastMotivationAt < MOTIVATION_COOLDOWN_MS) return;
    this.lastMotivationAt = now;
    this.say(this.pickFrom(this.script.restTalk), 'queue');
  }
}

function normaliseName(name: string | undefined): string | undefined {
  const trimmed = name?.trim();
  return trimmed ? trimmed : undefined;
}
