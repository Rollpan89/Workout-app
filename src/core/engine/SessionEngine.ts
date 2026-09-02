import type { InteractionLevel } from '../domain/settings';
import {
  DEFAULT_INTENSITY,
  resolvePrescription,
  resolveRestSeconds,
  stepIntensity,
  type IntensityLevel,
  type ResolvedPrescription,
} from '../intensity/intensity';
import { TypedEmitter, type Unsubscribe } from '../utils/emitter';
import type {
  CompletedSetRecord,
  PlanStep,
  SessionEvents,
  SessionPhase,
  SessionPlan,
  SessionSnapshot,
  SessionStats,
} from './types';

export interface SessionEngineOptions {
  readonly plan: SessionPlan;
  readonly interactionLevel: InteractionLevel;
  readonly intensity?: IntensityLevel;
  /** Seconds of "get ready" before the first set of each exercise. */
  readonly getReadySeconds?: number;
  /** Injectable clock for tests. Returns epoch milliseconds. */
  readonly now?: () => number;
}

const EMPTY_STATS: SessionStats = {
  completedSets: [],
  workSeconds: 0,
  restSeconds: 0,
  pausedSeconds: 0,
  intensitySecondsSum: 0,
};

/**
 * SessionEngine
 * -------------
 * A deterministic, clock-driven state machine that walks a SessionPlan.
 *
 * It owns NO timers. The host calls `tick(now)` on a regular interval
 * (~100 ms). Every state change is published as a `snapshot` event plus a
 * semantic event (`rep`, `restTick`, …) that the audio coach reacts to.
 *
 * Phase flow (hands-free):
 *   idle → announcing → working → resting → announcing|working → … → finished
 *
 * With interactionLevel = 'assisted' the engine stops in `awaitingStart`
 * before each set until `confirmStart()` is called. With 'manual' it also
 * expects `markRep()` / `completeSet()` from the user instead of counting.
 */
export class SessionEngine {
  readonly events = new TypedEmitter<SessionEvents>();

  private readonly plan: SessionPlan;
  private readonly now: () => number;
  private readonly getReadySeconds: number;

  private phase: SessionPhase = 'idle';
  private pausedFrom?: Exclude<SessionPhase, 'paused' | 'idle' | 'finished'>;
  private stepIndex = 0;
  private intensity: IntensityLevel;
  private interactionLevel: InteractionLevel;
  private target?: ResolvedPrescription;

  private repsDone = 0;
  private lastRepEmittedAt = 0; // ms, phase-relative
  private halfwayEmitted = false;

  private restTotalSeconds = 0;
  private lastWholeSecond = -1; // for tick de-duplication across phases

  private startedAt?: number;
  private phaseStartedAt = 0; // epoch ms
  private pausedAt = 0; // epoch ms
  private stats: SessionStats = EMPTY_STATS;

  constructor(options: SessionEngineOptions) {
    this.plan = options.plan;
    this.now = options.now ?? (() => Date.now());
    this.getReadySeconds = options.getReadySeconds ?? 5;
    this.intensity = options.intensity ?? DEFAULT_INTENSITY;
    this.interactionLevel = options.interactionLevel;
  }

  /* --------------------------------------------------------------------- */
  /* Public API                                                             */
  /* --------------------------------------------------------------------- */

  get snapshot(): SessionSnapshot {
    return this.buildSnapshot();
  }

  subscribe(listener: (snapshot: SessionSnapshot) => void): Unsubscribe {
    return this.events.on('snapshot', listener);
  }

  start(): void {
    if (this.phase !== 'idle') return;
    if (this.plan.steps.length === 0) {
      this.finish(true);
      return;
    }
    this.startedAt = this.now();
    this.events.emit('started', { plan: this.plan });
    this.enterAnnouncing();
  }

  /**
   * Advance time. Idempotent for the same `now`; safe to call at any rate.
   * Returns the new snapshot for convenience.
   */
  tick(now: number = this.now()): SessionSnapshot {
    switch (this.phase) {
      case 'announcing':
        this.tickAnnouncing(now);
        break;
      case 'working':
        this.tickWorking(now);
        break;
      case 'resting':
        this.tickResting(now);
        break;
      default:
        // idle / awaitingStart / paused / finished: nothing time-driven
        break;
    }
    // Always publish so the UI clock keeps moving
    if (this.phase !== 'idle' && this.phase !== 'finished') {
      this.publish();
    }
    return this.buildSnapshot();
  }

  pause(): void {
    if (
      this.phase === 'idle' ||
      this.phase === 'paused' ||
      this.phase === 'finished' ||
      this.phase === 'awaitingStart'
    ) {
      return;
    }
    this.pausedFrom = this.phase;
    this.pausedAt = this.now();
    this.phase = 'paused';
    this.events.emit('paused', {});
    this.publish();
  }

  resume(): void {
    if (this.phase !== 'paused' || !this.pausedFrom) return;
    const pausedFor = this.now() - this.pausedAt;
    // Shift the phase clock forward so elapsed time excludes the pause
    this.phaseStartedAt += pausedFor;
    this.stats = { ...this.stats, pausedSeconds: this.stats.pausedSeconds + pausedFor / 1000 };
    this.phase = this.pausedFrom;
    this.pausedFrom = undefined;
    this.events.emit('resumed', {});
    this.publish();
  }

  togglePause(): void {
    if (this.phase === 'paused') this.resume();
    else this.pause();
  }

  /** assisted/manual: user taps "go" for the next set. */
  confirmStart(): void {
    if (this.phase !== 'awaitingStart') return;
    this.enterWorking();
  }

  /** manual: user taps for each rep. */
  markRep(): void {
    if (this.phase !== 'working' || this.target?.kind !== 'reps') return;
    this.registerRep();
    if (this.repsDone >= this.target.reps) {
      this.completeCurrentSet();
    }
  }

  /** manual or override: finish the current set immediately. */
  completeSet(): void {
    if (this.phase !== 'working') return;
    this.completeCurrentSet();
  }

  /** Skip the rest and go straight to the next set. */
  skipRest(): void {
    if (this.phase !== 'resting') return;
    this.accumulateRest();
    this.events.emit('restEnded', { step: this.currentStep() });
    this.advance();
  }

  /** Jump to the next step regardless of phase (user pressed "skip"). */
  skipStep(): void {
    if (this.phase === 'idle' || this.phase === 'finished') return;
    if (this.phase === 'paused') this.resume();
    if (this.phase === 'working') this.accumulateWork();
    if (this.phase === 'resting') this.accumulateRest();
    this.advance();
  }

  adjustIntensity(delta: 1 | -1): IntensityLevel {
    const from = this.intensity;
    const to = stepIntensity(from, delta);
    if (from === to) return to;
    this.intensity = to;

    // Re-resolve the current target so the change is felt immediately
    if (this.target && (this.phase === 'working' || this.phase === 'awaitingStart')) {
      const step = this.currentStep();
      const next = resolvePrescription(step.workoutExercise.prescription, to);
      // Never reduce below what has already been done
      if (next.kind === 'reps') {
        this.target = { kind: 'reps', reps: Math.max(next.reps, this.repsDone) };
      } else {
        this.target = next;
      }
    }
    if (this.phase === 'resting') {
      const step = this.currentStep();
      const elapsed = this.phaseElapsedSeconds(this.now());
      const newTotal = resolveRestSeconds(step.baseRestSeconds, to);
      this.restTotalSeconds = Math.max(newTotal, Math.floor(elapsed) + 1);
    }

    this.events.emit('intensityChanged', { from, to });
    this.publish();
    return to;
  }

  setInteractionLevel(level: InteractionLevel): void {
    this.interactionLevel = level;
    this.publish();
  }

  /** Abort the session. Stats collected so far are kept. */
  stop(): void {
    if (this.phase === 'finished') return;
    if (this.phase === 'working') this.accumulateWork();
    if (this.phase === 'resting') this.accumulateRest();
    this.finish(false);
  }

  dispose(): void {
    this.events.removeAll();
  }

  /* --------------------------------------------------------------------- */
  /* Phase transitions                                                       */
  /* --------------------------------------------------------------------- */

  private enterAnnouncing(): void {
    const step = this.currentStep();
    this.target = resolvePrescription(step.workoutExercise.prescription, this.intensity);
    this.repsDone = 0;
    this.halfwayEmitted = false;
    this.lastRepEmittedAt = 0;
    this.lastWholeSecond = -1;
    this.phase = 'announcing';
    this.phaseStartedAt = this.now();
    this.events.emit('exerciseAnnounced', {
      step,
      target: this.target,
      getReadySeconds: this.getReadySeconds,
    });
    this.publish();
  }

  private enterAwaitingStart(): void {
    const step = this.currentStep();
    this.target = resolvePrescription(step.workoutExercise.prescription, this.intensity);
    this.repsDone = 0;
    this.halfwayEmitted = false;
    this.phase = 'awaitingStart';
    this.phaseStartedAt = this.now();
    this.events.emit('awaitingUser', { step });
    this.publish();
  }

  private enterWorking(): void {
    const step = this.currentStep();
    this.target ??= resolvePrescription(step.workoutExercise.prescription, this.intensity);
    this.repsDone = 0;
    this.lastRepEmittedAt = 0;
    this.lastWholeSecond = -1;
    this.halfwayEmitted = false;
    this.phase = 'working';
    this.phaseStartedAt = this.now();
    this.events.emit('setStarted', { step, target: this.target });
    this.publish();
  }

  private enterResting(): void {
    const step = this.currentStep();
    const seconds = resolveRestSeconds(step.baseRestSeconds, this.intensity);
    if (seconds <= 0) {
      this.advance();
      return;
    }
    this.restTotalSeconds = seconds;
    this.lastWholeSecond = -1;
    this.phase = 'resting';
    this.phaseStartedAt = this.now();
    this.events.emit('restStarted', {
      step,
      seconds,
      nextStep: this.plan.steps[this.stepIndex + 1],
    });
    this.publish();
  }

  /** Move to the next step (or finish). Decides which phase comes first. */
  private advance(): void {
    const nextIndex = this.stepIndex + 1;
    if (nextIndex >= this.plan.steps.length) {
      this.finish(true);
      return;
    }
    const prev = this.currentStep();
    this.stepIndex = nextIndex;
    const next = this.currentStep();

    const isNewExercise =
      prev.exercise.id !== next.exercise.id || prev.round !== next.round || prev.block !== next.block;

    if (this.interactionLevel === 'handsFree') {
      // New exercise → announce + countdown; same exercise → straight to work
      if (isNewExercise) this.enterAnnouncing();
      else this.enterWorking();
    } else {
      this.enterAwaitingStart();
    }
  }

  private finish(completed: boolean): void {
    this.phase = 'finished';
    const snapshot = this.buildSnapshot();
    this.events.emit('finished', { completed, snapshot });
    this.publish();
  }

  /* --------------------------------------------------------------------- */
  /* Ticking                                                                 */
  /* --------------------------------------------------------------------- */

  private tickAnnouncing(now: number): void {
    const elapsed = this.phaseElapsedSeconds(now);
    const remaining = Math.ceil(this.getReadySeconds - elapsed);
    const whole = Math.floor(elapsed);
    if (whole !== this.lastWholeSecond) {
      this.lastWholeSecond = whole;
      if (remaining > 0 && remaining <= 3) {
        this.events.emit('countdownTick', { remaining });
      }
    }
    if (elapsed >= this.getReadySeconds) {
      if (this.interactionLevel === 'handsFree') this.enterWorking();
      else this.enterAwaitingStart();
    }
  }

  private tickWorking(now: number): void {
    const step = this.currentStep();
    const target = this.target;
    if (!target) return;
    const elapsedMs = now - this.phaseStartedAt;
    const elapsed = elapsedMs / 1000;

    if (target.kind === 'reps') {
      if (this.interactionLevel === 'manual') return; // user drives reps
      const cadenceMs = step.exercise.secondsPerRep * 1000;
      // Emit reps that are "due". Loop handles long gaps between ticks.
      while (
        this.repsDone < target.reps &&
        elapsedMs - this.lastRepEmittedAt >= cadenceMs
      ) {
        this.lastRepEmittedAt += cadenceMs;
        this.registerRep();
      }
      if (this.repsDone >= target.reps) {
        this.completeCurrentSet();
      }
    } else {
      const whole = Math.floor(elapsed);
      if (whole !== this.lastWholeSecond) {
        this.lastWholeSecond = whole;
        this.events.emit('workTick', {
          step,
          elapsed: Math.min(whole, target.seconds),
          total: target.seconds,
        });
        if (!this.halfwayEmitted && target.seconds >= 20 && whole >= target.seconds / 2) {
          this.halfwayEmitted = true;
          this.events.emit('halfway', { step });
        }
      }
      if (this.interactionLevel !== 'manual' && elapsed >= target.seconds) {
        this.completeCurrentSet();
      }
    }
  }

  private tickResting(now: number): void {
    const elapsed = this.phaseElapsedSeconds(now);
    const remaining = Math.ceil(this.restTotalSeconds - elapsed);
    const whole = Math.floor(elapsed);
    if (whole !== this.lastWholeSecond) {
      this.lastWholeSecond = whole;
      if (remaining > 0) {
        this.events.emit('restTick', { remaining, total: this.restTotalSeconds });
      }
    }
    if (elapsed >= this.restTotalSeconds) {
      this.accumulateRest();
      this.events.emit('restEnded', { step: this.currentStep() });
      this.advance();
    }
  }

  /* --------------------------------------------------------------------- */
  /* Helpers                                                                 */
  /* --------------------------------------------------------------------- */

  private registerRep(): void {
    const step = this.currentStep();
    const target = this.target;
    if (!target || target.kind !== 'reps') return;
    this.repsDone += 1;
    this.events.emit('rep', { step, rep: this.repsDone, total: target.reps });
    if (!this.halfwayEmitted && target.reps >= 8 && this.repsDone === Math.ceil(target.reps / 2)) {
      this.halfwayEmitted = true;
      this.events.emit('halfway', { step });
    }
  }

  private completeCurrentSet(): void {
    const step = this.currentStep();
    const target = this.target;
    const seconds = this.phaseElapsedSeconds(this.now());
    const record: CompletedSetRecord = {
      stepIndex: step.index,
      exerciseId: step.exercise.id,
      reps: target?.kind === 'reps' ? this.repsDone : 0,
      seconds,
      intensity: this.intensity,
    };
    this.accumulateWork();
    this.stats = { ...this.stats, completedSets: [...this.stats.completedSets, record] };
    this.events.emit('setCompleted', { step, record });
    this.enterResting();
  }

  private accumulateWork(): void {
    const seconds = this.phaseElapsedSeconds(this.now());
    this.stats = {
      ...this.stats,
      workSeconds: this.stats.workSeconds + seconds,
      intensitySecondsSum: this.stats.intensitySecondsSum + seconds * this.intensity,
    };
  }

  private accumulateRest(): void {
    const seconds = Math.min(this.phaseElapsedSeconds(this.now()), this.restTotalSeconds);
    this.stats = {
      ...this.stats,
      restSeconds: this.stats.restSeconds + seconds,
      intensitySecondsSum: this.stats.intensitySecondsSum + seconds * this.intensity,
    };
  }

  private phaseElapsedSeconds(now: number): number {
    return Math.max(0, (now - this.phaseStartedAt) / 1000);
  }

  private currentStep(): PlanStep {
    const step = this.plan.steps[this.stepIndex];
    if (!step) throw new Error(`SessionEngine: no step at index ${this.stepIndex}`);
    return step;
  }

  private publish(): void {
    this.events.emit('snapshot', this.buildSnapshot());
  }

  private buildSnapshot(): SessionSnapshot {
    const now = this.phase === 'paused' ? this.pausedAt : this.now();
    const phaseElapsed = this.phaseElapsedSeconds(now);
    const step = this.plan.steps[this.stepIndex];
    const activePhase = this.phase === 'paused' ? this.pausedFrom : this.phase;

    let sessionElapsed = 0;
    if (this.startedAt !== undefined) {
      sessionElapsed = (now - this.startedAt) / 1000 - this.stats.pausedSeconds;
      if (this.phase === 'paused') {
        // pausedSeconds does not yet include the current pause; `now` is pausedAt so fine.
      }
    }

    return {
      phase: this.phase,
      pausedFrom: this.pausedFrom,
      stepIndex: this.stepIndex,
      totalSteps: this.plan.steps.length,
      step,
      intensity: this.intensity,
      interactionLevel: this.interactionLevel,
      target: this.target,
      repsDone: this.repsDone,
      workElapsedSeconds: activePhase === 'working' ? phaseElapsed : 0,
      restRemainingSeconds:
        activePhase === 'resting' ? Math.max(0, this.restTotalSeconds - phaseElapsed) : 0,
      restTotalSeconds: activePhase === 'resting' ? this.restTotalSeconds : 0,
      announceRemainingSeconds:
        activePhase === 'announcing' ? Math.max(0, this.getReadySeconds - phaseElapsed) : 0,
      sessionElapsedSeconds: Math.max(0, sessionElapsed),
      startedAt: this.startedAt,
      stats: this.stats,
    };
  }
}
