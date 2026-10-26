import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import { create } from 'zustand';

import { getAudioSession } from '@/adapters/audio/audioSession';
import { applyVoiceSettings, getSpeech as getSharedSpeech } from '@/adapters/speech/speechInstance';
import { haptic } from '@/adapters/haptics/haptics';
import { Coach } from '@/core/coach/Coach';
import { getCoachScript } from '@/core/coach/script';
import { SilentSpeech, type SpeechPort } from '@/core/coach/SpeechPort';
import {
  effectiveVoiceParams,
  SPEECH_LANGUAGE_TAG,
  tempoFactorFor,
  TEMPO_STEP,
  type InteractionLevel,
  type SessionLog,
  type Workout,
} from '@/core/domain';
import { buildSessionPlan } from '@/core/engine/planner';
import { SessionEngine } from '@/core/engine/SessionEngine';
import type { PlanStep, SessionCheckpoint, SessionPlan, SessionSnapshot } from '@/core/engine/types';
import {
  buildLoadCue,
  platesPerSide,
  sessionLoad,
  stepWeightKg,
  suggestLoad,
  type LoadCue,
} from '@/core/load/load';
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

/** Session state exposed to the UI. */
export interface SessionState {
  plan?: SessionPlan;
  /** Latest engine snapshot – the 100 ms tick only touches this field. */
  snapshot?: SessionSnapshot;
  result?: SessionLog;
  saving: boolean;
  pendingCheckpoint?: SessionCheckpoint;
  /** External load for the exercise the controls are editing. 0 = none. */
  loadKg: number;
  feltHeavy: boolean;
}

/** Actions & orchestration. The live engine is kept outside React state. */
export interface SessionActions {
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
  adjustTempo: (delta: 1 | -1) => void;
  adjustLoad: (delta: 1 | -1) => void;
  markHeavy: () => void;
  stop: () => void;
  reset: () => void;
}

export type SessionStore = SessionState & SessionActions;

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
/** Delayed audio teardown of a finished session – cancelled if a new one starts. */
let audioEndTimer: ReturnType<typeof setTimeout> | undefined;
/** Weights the user set during this session. 0 means they cleared a suggestion. */
let loadOverrides = new Map<string, number>();
let heavyIds = new Set<string>();

function resetLoadMemory(): void {
  loadOverrides = new Map();
  heavyIds = new Set();
}

function cueFor(step: PlanStep): LoadCue {
  const suggestion = suggestLoad(useHistoryStore.getState().logs, step.exercise.id, step.workoutExercise.weightKg, {
    id: step.exercise.id,
    category: step.exercise.category,
    equipment: step.exercise.equipment,
    muscles: step.exercise.muscles,
  });
  const done = engine?.snapshot.stats.completedSets ?? [];
  const already = sessionLoad(
    done.map((set) => ({
      exerciseId: set.exerciseId,
      reps: set.reps,
      seconds: set.seconds,
      weightKg: set.weightKg,
    })),
    step.exercise.id,
  );
  // A weight already lifted this session is kept. The +2.5 kg step waits until next time.
  const override = loadOverrides.has(step.exercise.id) ? loadOverrides.get(step.exercise.id) : already;
  return buildLoadCue(suggestion, step.exercise.equipment, override);
}

/** During rest the athlete is loading the *next* exercise, so the controls follow that. */
function loadTarget(): PlanStep | undefined {
  const snap = engine?.snapshot;
  const plan = useSessionStore.getState().plan;
  if (!snap?.step) return undefined;
  const resting = snap.phase === 'resting' || (snap.phase === 'paused' && snap.pausedFrom === 'resting');
  if (!resting || !plan) return snap.step;
  return plan.steps[snap.stepIndex + 1] ?? snap.step;
}

function publishLoad(step: PlanStep): void {
  const cue = cueFor(step);
  const current = engine?.snapshot.step;
  if (current && current.exercise.id === step.exercise.id) {
    engine?.setLoad(cue.todayKg);
    engine?.markHeavy(heavyIds.has(step.exercise.id));
  }
  useSessionStore.setState({
    loadKg: cue.todayKg ?? 0,
    feltHeavy: heavyIds.has(step.exercise.id),
  });
}

function speakLine(text: string): void {
  const settings = useSettingsStore.getState().settings;
  if (!settings.voice.enabled || text.length === 0) return;
  const params = effectiveVoiceParams(settings.voice);
  getSpeech().speak({
    text,
    language: SPEECH_LANGUAGE_TAG[settings.locale],
    rate: params.rate,
    pitch: params.pitch,
    priority: 'queue',
  });
}

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

function handleAppStateChange(next: AppStateStatus): void {
  const wasBackground = lastAppState === 'background' || lastAppState === 'inactive';
  lastAppState = next;
  if (next === 'active' && wasBackground) {
    engine?.tick();
  }
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  plan: undefined,
  snapshot: undefined,
  result: undefined,
  saving: false,
  pendingCheckpoint: undefined,
  loadKg: 0,
  feltHeavy: false,

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
    // A session that just ended schedules its audio teardown a few seconds
    // later (so the finish line is heard); starting a new one cancels it.
    resetLoadMemory();
    if (audioEndTimer) clearTimeout(audioEndTimer);
    audioEndTimer = undefined;
    teardownRuntime();
    const settings = useSettingsStore.getState().settings;
    const repos = getRepositories();
    const lookup = repos.workouts.exerciseLookup();
    const plan = buildSessionPlan(workout, lookup);
    const sessionTempo = {
      tempoPreset: settings.tempoPreset,
      tempoOverrides: settings.tempoOverrides,
    };
    const tempoFor = (exerciseId: string) =>
      settings.tempoOverrides[exerciseId] ??
      tempoFactor ??
      tempoFactorFor(sessionTempo, exerciseId);

    engine = new SessionEngine({
      plan,
      interactionLevel:
        resumeFrom?.interactionLevel ?? interactionLevel ?? settings.interactionLevel,
      intensity: resumeFrom?.intensity ?? intensity ?? DEFAULT_INTENSITY,
      tempoFactor: plan.steps[0] ? tempoFor(plan.steps[0].exercise.id) : tempoFactor,
    });

    const applyExerciseTempo = (exerciseId: string) => {
      const wanted = tempoFor(exerciseId);
      if (engine && Math.abs(engine.tempo - wanted) > 0.001)
        engine.setTempoFactor(wanted, { silent: true });
    };
    engine.events.on('exerciseAnnounced', ({ step }) => {
      applyExerciseTempo(step.exercise.id);
      publishLoad(step);
    });
    engine.events.on('awaitingUser', ({ step }) => {
      applyExerciseTempo(step.exercise.id);
      publishLoad(step);
    });
    engine.events.on('restStarted', ({ step, nextStep }) => publishLoad(nextStep ?? step));

    applyVoiceSettings(settings.locale, settings.voice);
    coach = new Coach({
      speech: settings.voice.enabled ? getSpeech() : new SilentSpeech(),
      locale: settings.locale,
      voice: settings.voice,
      userName: settings.profile.displayName,
      haptic: settings.voice.haptics ? haptic : undefined,
      loadCue: (step) => cueFor(step),
    });
    coach.attach(engine);

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
      if (audioEndTimer) clearTimeout(audioEndTimer);
      audioEndTimer = setTimeout(() => {
        audioEndTimer = undefined;
        void getAudioSession().end();
      }, 4000);
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

    set({ plan, snapshot: engine.snapshot, result: undefined, pendingCheckpoint: undefined, loadKg: 0, feltHeavy: false });

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
    if (step) useSettingsStore.getState().setTempoOverride(step.exercise.id, next);
  },
  adjustLoad: (delta) => {
    const step = loadTarget();
    if (!step) return;
    const current = cueFor(step).todayKg ?? 0;
    const next = stepWeightKg(current, delta, step.exercise.equipment);
    loadOverrides.set(step.exercise.id, next);
    publishLoad(step);
    haptic('tap');
    const script = getCoachScript(useSettingsStore.getState().settings.locale);
    if (next <= 0) {
      speakLine(script.noWeight);
      return;
    }
    const parts = [script.weight(next)];
    if (step.exercise.equipment.includes('barbell')) {
      const plates = platesPerSide(next);
      if (plates && plates.length === 0) parts.push(script.emptyBar);
      else if (plates && plates.length > 0) parts.push(script.plates(plates));
    }
    speakLine(parts.join(' '));
  },
  markHeavy: () => {
    const step = loadTarget();
    if (!step || (cueFor(step).todayKg ?? 0) <= 0) return;
    const next = !heavyIds.has(step.exercise.id);
    if (next) heavyIds.add(step.exercise.id);
    else heavyIds.delete(step.exercise.id);
    publishLoad(step);
    haptic('tap');
    const script = getCoachScript(useSettingsStore.getState().settings.locale);
    speakLine(next ? script.heavyNoted : script.heavyCleared);
  },
  stop: () => engine?.stop(),

  reset: () => {
    const { snapshot: currentSnapshot, plan: currentPlan, result: currentResult } = get();
    const wasRunning = !!engine && !currentResult;
    teardownRuntime();
    if (wasRunning) clearCheckpoint();
    resetLoadMemory();
    if (currentSnapshot || currentPlan) {
      set({ plan: undefined, snapshot: undefined, result: undefined, saving: false, loadKg: 0, feltHeavy: false });
    }
  },
}));
