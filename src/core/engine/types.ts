import type { Exercise } from '../domain/exercise';
import type { InteractionLevel } from '../domain/settings';
import type { Workout, WorkoutBlock, WorkoutExercise } from '../domain/workout';
import type { IntensityLevel, ResolvedPrescription } from '../intensity/intensity';

/* ------------------------------------------------------------------------ */
/* Plan – the flattened, intensity-agnostic timeline of a workout            */
/* ------------------------------------------------------------------------ */

/**
 * A single set in the flattened plan. The engine walks these in order.
 * Rest is *not* a step of its own – it is a phase that follows each set –
 * because rest duration depends on intensity, which can change at any time.
 */
export interface PlanStep {
  readonly index: number;
  readonly block: WorkoutBlock;
  readonly round: number; // 1-based
  readonly rounds: number;
  readonly workoutExercise: WorkoutExercise;
  readonly exercise: Exercise;
  readonly setNumber: number; // 1-based
  readonly totalSets: number;
  /** True if the next step is a different exercise (or the end). */
  readonly isLastSetOfExercise: boolean;
  /** Base rest in seconds before intensity is applied. 0 = none. */
  readonly baseRestSeconds: number;
}

export interface SessionPlan {
  readonly workout: Workout;
  readonly steps: readonly PlanStep[];
}

/* ------------------------------------------------------------------------ */
/* Runtime state                                                              */
/* ------------------------------------------------------------------------ */

export type SessionPhase =
  | 'idle' // plan loaded, nothing started
  | 'announcing' // coach is presenting the upcoming exercise (get-ready)
  | 'awaitingStart' // assisted/manual: waiting for the user to tap "go"
  | 'working' // counting reps / seconds
  | 'resting' // rest timer running
  | 'paused'
  | 'finished';

export interface SessionSnapshot {
  readonly phase: SessionPhase;
  /** Phase we were in before pause; undefined unless phase === 'paused'. */
  readonly pausedFrom?: Exclude<SessionPhase, 'paused' | 'idle' | 'finished'>;
  readonly stepIndex: number;
  readonly totalSteps: number;
  readonly step?: PlanStep;
  readonly intensity: IntensityLevel;
  readonly interactionLevel: InteractionLevel;
  /** Prescription for the current step after intensity has been applied. */
  readonly target?: ResolvedPrescription;
  /** Reps completed in the current set (rep-based) */
  readonly repsDone: number;
  /** Seconds elapsed in the current work phase (time-based & for display) */
  readonly workElapsedSeconds: number;
  /** Rest remaining, in seconds (only meaningful while resting). */
  readonly restRemainingSeconds: number;
  readonly restTotalSeconds: number;
  /** Seconds remaining in the get-ready countdown while announcing. */
  readonly announceRemainingSeconds: number;
  readonly sessionElapsedSeconds: number;
  readonly startedAt?: number; // epoch ms
  /** Cumulative stats for the metrics engine. */
  readonly stats: SessionStats;
}

export interface CompletedSetRecord {
  readonly stepIndex: number;
  readonly exerciseId: string;
  readonly reps: number; // reps done, or 0 for time-based
  readonly seconds: number; // work seconds actually spent
  readonly intensity: IntensityLevel;
}

export interface SessionStats {
  readonly completedSets: readonly CompletedSetRecord[];
  readonly workSeconds: number;
  readonly restSeconds: number;
  readonly pausedSeconds: number;
  /** Intensity-weighted seconds; averageIntensity = sum / elapsed. */
  readonly intensitySecondsSum: number;
}

/* ------------------------------------------------------------------------ */
/* Events – consumed by the coach (speech) and the UI                          */
/* ------------------------------------------------------------------------ */

export type SessionEvents = {
  started: { plan: SessionPlan };
  /** New exercise is about to begin – the coach introduces it. */
  exerciseAnnounced: { step: PlanStep; target: ResolvedPrescription; getReadySeconds: number };
  /** Get-ready countdown ticks (3, 2, 1). */
  countdownTick: { remaining: number };
  setStarted: { step: PlanStep; target: ResolvedPrescription };
  /** Emitted on every rep at the configured cadence (rep-based sets). */
  rep: { step: PlanStep; rep: number; total: number };
  /** Emitted every second during time-based sets. */
  workTick: { step: PlanStep; elapsed: number; total: number };
  setCompleted: { step: PlanStep; record: CompletedSetRecord };
  restStarted: { step: PlanStep; seconds: number; nextStep?: PlanStep };
  restTick: { remaining: number; total: number };
  restEnded: { step: PlanStep };
  /** Waiting for user confirmation (assisted / manual interaction levels). */
  awaitingUser: { step: PlanStep };
  intensityChanged: { from: IntensityLevel; to: IntensityLevel };
  halfway: { step: PlanStep };
  paused: Record<string, never>;
  resumed: Record<string, never>;
  finished: { completed: boolean; snapshot: SessionSnapshot };
  /** Any state change – UI stores subscribe to this. */
  snapshot: SessionSnapshot;
};
