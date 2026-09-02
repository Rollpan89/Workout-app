import { resolveLocalized, SPEECH_LANGUAGE_TAG, type Locale } from '../domain/localized';
import type { VoiceSettings } from '../domain/settings';
import type { SessionEngine } from '../engine/SessionEngine';
import type { PlanStep } from '../engine/types';
import { intensityLabelKey } from '../intensity/intensity';
import type { Unsubscribe } from '../utils/emitter';
import { getCoachScript, spokenNumber, type CoachScript } from './script';
import type { SpeechPort, SpeechUtterance } from './SpeechPort';

export interface CoachOptions {
  readonly speech: SpeechPort;
  readonly locale: Locale;
  readonly voice: VoiceSettings;
  /** Optional haptic hook, fired on each rep and at phase changes. */
  readonly haptic?: (kind: 'rep' | 'go' | 'done' | 'warn') => void;
  readonly random?: () => number;
}

/**
 * Coach
 * -----
 * Subscribes to SessionEngine events and turns them into speech. It is the
 * single place that decides *what* is said and *when* – the engine knows
 * nothing about audio, and the speech port knows nothing about workouts.
 */
export class Coach {
  private speech: SpeechPort;
  private locale: Locale;
  private voice: VoiceSettings;
  private script: CoachScript;
  private readonly haptic?: CoachOptions['haptic'];
  private readonly random: () => number;
  private subscriptions: Unsubscribe[] = [];
  private lastMotivationAt = 0;

  constructor(options: CoachOptions) {
    this.speech = options.speech;
    this.locale = options.locale;
    this.voice = options.voice;
    this.script = getCoachScript(options.locale);
    this.haptic = options.haptic;
    this.random = options.random ?? Math.random;
  }

  attach(engine: SessionEngine): void {
    this.detach();
    const { events } = engine;

    this.subscriptions.push(
      events.on('exerciseAnnounced', ({ step, target }) => {
        const name = this.exerciseName(step);
        const targetText =
          target.kind === 'reps'
            ? this.script.repsTarget(target.reps)
            : this.script.timeTarget(target.seconds);
        this.say(this.script.getReady(name, targetText), 'interrupt');
        if (step.totalSets > 1) this.say(this.script.setOf(step.setNumber, step.totalSets), 'queue');
        const cue = step.exercise.cue;
        if (cue) this.say(resolveLocalized(cue, this.locale), 'queue');
      }),

      events.on('countdownTick', ({ remaining }) => {
        this.say(spokenNumber(this.script, remaining), 'interrupt');
      }),

      events.on('awaitingUser', ({ step }) => {
        // After the get-ready countdown the exercise has already been
        // introduced, so only remind the user which set is next.
        if (step.totalSets > 1) {
          this.say(this.script.setOf(step.setNumber, step.totalSets), 'interrupt');
          this.say(this.script.tapWhenReady, 'queue');
        } else {
          this.say(this.script.tapWhenReady, 'interrupt');
        }
      }),

      events.on('setStarted', ({ step }) => {
        this.haptic?.('go');
        // For sets after the first within an exercise, briefly say which set
        if (step.setNumber > 1 && engine.snapshot.interactionLevel === 'handsFree') {
          this.say(this.script.setOf(step.setNumber, step.totalSets), 'interrupt');
          this.say(this.script.go, 'queue');
        } else {
          this.say(this.script.go, 'interrupt');
        }
      }),

      events.on('rep', ({ rep, total }) => {
        this.haptic?.('rep');
        if (rep === total && total > 1) {
          this.say(this.script.lastRep, 'interrupt');
          return;
        }
        if (this.voice.countEveryRep || rep % 5 === 0 || rep === 1) {
          this.say(spokenNumber(this.script, rep), 'interrupt');
        }
      }),

      events.on('workTick', ({ elapsed, total }) => {
        const remaining = total - elapsed;
        // Count down the last three seconds, and call out 10 s left on long holds
        if (remaining > 0 && remaining <= 3) {
          this.say(spokenNumber(this.script, remaining), 'interrupt');
        } else if (remaining === 10 && total >= 20) {
          this.say(this.script.timeLeft(10), 'drop');
        }
      }),

      events.on('halfway', () => {
        this.say(this.script.halfway, 'drop');
      }),

      events.on('setCompleted', () => {
        this.haptic?.('done');
        this.say(this.script.setDone, 'interrupt');
      }),

      events.on('restStarted', ({ seconds, nextStep, step }) => {
        this.say(this.script.rest(seconds), 'queue');
        if (nextStep && nextStep.exercise.id !== step.exercise.id) {
          this.say(this.script.nextUp(this.exerciseName(nextStep)), 'queue');
        }
        this.maybeMotivate();
      }),

      events.on('restTick', ({ remaining, total }) => {
        if (remaining === 3 && total > 5) {
          this.say(this.script.restEnding, 'interrupt');
        } else if (remaining <= 2 && remaining >= 1) {
          this.say(spokenNumber(this.script, remaining), 'interrupt');
        } else if (remaining === 10 && total >= 30) {
          this.say(this.script.timeLeft(10), 'drop');
        }
      }),

      events.on('intensityChanged', ({ to }) => {
        this.haptic?.('warn');
        this.say(this.script.intensity(intensityLabelKey(to)), 'interrupt');
      }),

      events.on('paused', () => {
        this.speech.stop();
        this.say(this.script.paused, 'interrupt');
      }),

      events.on('resumed', () => {
        this.say(this.script.resumed, 'interrupt');
      }),

      events.on('finished', ({ completed }) => {
        this.haptic?.('done');
        this.say(completed ? this.script.finished : this.script.aborted, 'interrupt');
      }),
    );
  }

  detach(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];
    this.speech.stop();
  }

  updateSettings(locale: Locale, voice: VoiceSettings): void {
    this.locale = locale;
    this.voice = voice;
    this.script = getCoachScript(locale);
  }

  setSpeech(speech: SpeechPort): void {
    this.speech.stop();
    this.speech = speech;
  }

  /* ------------------------------------------------------------------ */

  private say(text: string, priority: SpeechUtterance['priority']): void {
    if (!this.voice.enabled) return;
    this.speech.speak({
      text,
      language: SPEECH_LANGUAGE_TAG[this.locale],
      rate: this.voice.rate,
      pitch: this.voice.pitch,
      priority,
    });
  }

  private exerciseName(step: PlanStep): string {
    return resolveLocalized(step.exercise.name, this.locale);
  }

  private maybeMotivate(): void {
    if (!this.voice.motivation) return;
    const now = Date.now();
    // At most one motivational line per ~45 s, and not every time
    if (now - this.lastMotivationAt < 45_000 || this.random() < 0.5) return;
    this.lastMotivationAt = now;
    const lines = this.script.motivation;
    const line = lines[Math.floor(this.random() * lines.length)];
    if (line) this.say(line, 'drop');
  }
}
