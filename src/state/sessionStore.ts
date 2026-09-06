import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import { create } from 'zustand';

import { getAudioSession } from '@/adapters/audio/audioSession';
import { applyVoiceSettings, getSpeech as getSharedSpeech } from '@/adapters/speech/speechInstance';
import { haptic } from '@/adapters/haptics/haptics';
import { Coach } from '@/core/coach/Coach';
import { SilentSpeech, type SpeechPort } from '@/core/coach/SpeechPort';
import { tempoFactorFor, TEMPO_STEP, type InteractionLevel, type SessionLog, type Workout } from '@/core/domain';
import { buildSessionPlan } from '@/core/engine/planner';
import { SessionEngine } from '@/core/engine/SessionEngine';
import type { SessionCheckpoint, SessionPlan, SessionSnapshot } from '@/core/engine/types';
import { DEFAULT_INTENSITY, type IntensityLevel } from '@/core/intensity/intensity';
import { buildSessionLog } from '@/core/metrics/metrics';
import { getRepositories } from '@/data';

import { useHistoryStore } from './historyStore';
import { useSettingsStore } from './settingsStore';

const TICK_MS = 100;
/** How often the in-progress checkpoint is written while a phase runs. */
const CHECKPOINT_MS = 5_000;
/** A checkpoint older than this is not offered for resumption. */
export const CHECKPOINT_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export interface StartSessionOptions {
  readonly workout: Workout;
  readonly intensity?: IntensityLevel;
  readonly interactionLevel?: InteractionLevel;
  /** Rep tempo factor for the session (overridden per exercise by learned values). */
  readonly tempoFactor?: number;
  /** Continue an interrupted session instead of starting from the top. */
  readonly resumeFrom?: SessionCheckpoint;
}

interface SessionState {
  plan?: SessionPlan;
  snapshot?: SessionSnapshot;
  /** Log produced when the session finished; cleared on `reset`. */
  result?: SessionLog;
  saving: boolean;
  /**
   * Checkpoint of a session that was interrupted (app killed / crashed),
   * found at start-up. Undefined once resumed or discarded.
   */
  pendingCheckpoint?: SessionCheckpoint;

  /** Look for an interrupted session (called once at app start). */
  loadPendingCheckpoint: () => Promise<void>;
  discardPendingCheckpoint: () => void;

  start: (options: StartSessionOptions) => void;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  confirmStart: () => void;
  markRep: () => void;
  completeSet: () => void;
  skipRest: () => void;
  skipStep: () => void;
  adjustIntensity: (delta: 1 | -1) => void;
  /** Slower (+1) or faster (−1) rep count for the current exercise; remembered. */
  adjustTempo: (delta: 1 | -1) => void;
  stop: () => void;
  reset: () => void;
}

/* Module-level runtime objects – deliberately kept out of React state. */
let engine: SessionEngine | undefined;
let coach: Coach | undefined;
let speech: SpeechPort | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
let unsubscribeSettings: (() => void) | undefined;
let appStateSub: NativeEventSubscription | undefined;
let lastAppState: AppStateStatus = AppState.currentState ?? 'active';
let lastCheckpointAt = 0;
let checkpointKey: string | undefined;

/** Write on every step/phase change, otherwise at most every CHECKPOINT_MS. */
function writeCheckpoint(force = false): void {
  if (!engine) return;
  const snap = engine.snapshot;
  const now = Date.now();
  const key = `${snap.stepIndex}:${snap.phase}`;
  if (!force && key === checkpointKey && now - lastCheckpointAt < CHECKPOINT_MS) return;
  const cp = engine.checkpoint(now);
  if (!cp) return;
  lastCheckpointAt = now;
  checkpointKey = key;
  getRepositories()
    .sessions.saveCheckpoint(cp)
    .catch((error) => console.warn('[session] checkpoint failed', error));
}

function clearCheckpoint(): void {
  checkpointKey = undefined;
  lastCheckpointAt = 0;
  getRepositories()
    .sessions.clearCheckpoint()
    .catch((error) => console.warn('[session] clear checkpoint failed', error));
}

function getSpeech(): SpeechPort {
  speech ??= getSharedSpeech();
  return speech;
}

function teardownRuntime(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
  coach?.detach();
  coach = undefined;
  engine?.dispose();
  engine = undefined;
  unsubscribeSettings?.();
  unsubscribeSettings = undefined;
  appStateSub?.remove();
  appStateSub = undefined;
  void getAudioSession().end();
}

/**
 * Background policy. The whole point of the app is that the coach keeps
 * talking with the screen locked, so we do NOT pause on `background`. We do
 * tick immediately on return: if the OS froze our timers the engine's
 * bounded catch-up moves the set forward and the coach re-announces the
 * position ("Vi fortsätter. Set 2, rep 5 av 12.").
 */
function handleAppStateChange(next: AppStateStatus): void {
  const wasBackground = lastAppState === 'background' || lastAppState === 'inactive';
  lastAppState = next;
  if (next === 'active' && wasBackground) {
    engine?.tick();
  }
}

export const useSessionStore = create<SessionState>((set, get) => ({
  plan: undefined,
  snapshot: undefined,
  result: undefined,
  saving: false,
  pendingCheckpoint: undefined,

  loadPendingCheckpoint: async () => {
    try {
      const cp = await getRepositories().sessions.loadCheckpoint();
      if (!cp) return;
      const fresh = Date.now() - cp.savedAt < CHECKPOINT_MAX_AGE_MS;
      if (!fresh) {
        clearCheckpoint();
        return;
      }
      set({ pendingCheckpoint: cp });
    } catch (error) {
      console.warn('[session] could not read checkpoint', error);
    }
  },

  discardPendingCheckpoint: () => {
    clearCheckpoint();
    set({ pendingCheckpoint: undefined });
  },

  start: ({ workout, intensity, interactionLevel, tempoFactor, resumeFrom }) => {
    teardownRuntime();
    const settings = useSettingsStore.getState().settings;
    const repos = getRepositories();
    const lookup = repos.workouts.exerciseLookup();
    const plan = buildSessionPlan(workout, lookup);
    const sessionTempo = { tempoPreset: settings.tempoPreset, tempoOverrides: settings.tempoOverrides };
    const tempoFor = (exerciseId: string) =>
      settings.tempoOverrides[exerciseId] ?? tempoFactor ?? tempoFactorFor(sessionTempo, exerciseId);

    engine = new SessionEngine({
      plan,
      interactionLevel: resumeFrom?.interactionLevel ?? interactionLevel ?? settings.interactionLevel,
      intensity: resumeFrom?.intensity ?? intensity ?? DEFAULT_INTENSITY,
      tempoFactor: plan.steps[0] ? tempoFor(plan.steps[0].exercise.id) : tempoFactor,
    });

    // Each exercise starts at its own learned tempo (or the session default).
    // Done silently: the engine skips the tempoChanged event when unchanged,
    // and the coach only announces tempo changes made by the user.
    const applyExerciseTempo = (exerciseId: string) => {
      const wanted = tempoFor(exerciseId);
      if (engine && Math.abs(engine.tempo - wanted) > 0.001) engine.setTempoFactor(wanted, { silent: true });
    };
    engine.events.on('exerciseAnnounced', ({ step }) => applyExerciseTempo(step.exercise.id));
    engine.events.on('awaitingUser', ({ step }) => applyExerciseTempo(step.exercise.id));

    applyVoiceSettings(settings.locale, settings.voice);
    coach = new Coach({
      speech: settings.voice.enabled ? getSpeech() : new SilentSpeech(),
      locale: settings.locale,
      voice: settings.voice,
      userName: settings.profile.displayName,
      haptic: settings.voice.haptics ? haptic : undefined,
    });
    coach.attach(engine);

    // Keep the coach in sync if the user changes voice/locale mid-session
    unsubscribeSettings = useSettingsStore.subscribe((state) => {
      coach?.updateSettings(
        state.settings.locale,
        state.settings.voice,
        state.settings.profile.displayName,
      );
      applyVoiceSettings(state.settings.locale, state.settings.voice);
      if (state.settings.voice.enabled) coach?.setSpeech(getSpeech());
      else coach?.setSpeech(new SilentSpeech());
    });

    engine.events.on('snapshot', (snapshot) => {
      set({ snapshot });
      if (snapshot.phase !== 'idle' && snapshot.phase !== 'finished') writeCheckpoint();
    });

    engine.events.on('finished', ({ completed, snapshot }) => {
      if (timer) clearInterval(timer);
      timer = undefined;
      appStateSub?.remove();
      appStateSub = undefined;
      // Let the coach's closing line finish before the session is released.
      setTimeout(() => void getAudioSession().end(), 4000);
      clearCheckpoint();
      const profile = useSettingsStore.getState().settings.profile;
      const log = buildSessionLog(plan, snapshot, completed, profile, lookup);
      set({ result: log, saving: true });
      useHistoryStore
        .getState()
        .add(log)
        .catch((error) => console.warn('[session] failed to save log', error))
        .finally(() => set({ saving: false }));
    });

    set({ plan, snapshot: engine.snapshot, result: undefined, pendingCheckpoint: undefined });
    // The keep-alive player also drives the engine while the OS has frozen
    // our JS timers (Android with the screen locked). Ticks are idempotent,
    // so running both clocks in the foreground is harmless.
    const startedEngine = engine;
    void getAudioSession().begin({
      onTick: () => {
        if (engine === startedEngine) engine?.tick();
      },
    });
    lastAppState = AppState.currentState ?? 'active';
    appStateSub = AppState.addEventListener('change', handleAppStateChange);
    checkpointKey = undefined;
    lastCheckpointAt = 0;
    if (resumeFrom && resumeFrom.workoutId === workout.id) engine.restore(resumeFrom);
    else engine.start();
    timer = setInterval(() => engine?.tick(), TICK_MS);
  },

  pause: () => engine?.pause(),
  resume: () => engine?.resume(),
  togglePause: () => engine?.togglePause(),
  confirmStart: () => {
    haptic('tap');
    engine?.confirmStart();
  },
  markRep: () => engine?.markRep(),
  completeSet: () => engine?.completeSet(),
  skipRest: () => engine?.skipRest(),
  skipStep: () => engine?.skipStep(),
  adjustIntensity: (delta) => {
    engine?.adjustIntensity(delta);
  },
  adjustTempo: (delta) => {
    if (!engine) return;
    const step = engine.snapshot.step;
    const next = engine.setTempoFactor(engine.tempo + delta * TEMPO_STEP);
    // Learn it for this exercise so the next session starts right.
    if (step) useSettingsStore.getState().setTempoOverride(step.exercise.id, next);
  },
  stop: () => engine?.stop(),

  reset: () => {
    const wasRunning = !!engine && !get().result;
    teardownRuntime();
    if (wasRunning) clearCheckpoint(); // user left mid-session on purpose
    if (get().snapshot || get().plan) {
      set({ plan: undefined, snapshot: undefined, result: undefined, saving: false });
    }
  },
}));

export const selectSnapshot = (s: SessionState) => s.snapshot;
export const selectIsActive = (s: SessionState) =>
  !!s.snapshot && s.snapshot.phase !== 'idle' && s.snapshot.phase !== 'finished';
