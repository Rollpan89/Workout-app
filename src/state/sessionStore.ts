import { create } from 'zustand';

import { ExpoSpeech } from '@/adapters/speech/ExpoSpeech';
import { haptic } from '@/adapters/haptics/haptics';
import { Coach } from '@/core/coach/Coach';
import { SilentSpeech, type SpeechPort } from '@/core/coach/SpeechPort';
import type { InteractionLevel, SessionLog, Workout } from '@/core/domain';
import { buildSessionPlan } from '@/core/engine/planner';
import { SessionEngine } from '@/core/engine/SessionEngine';
import type { SessionPlan, SessionSnapshot } from '@/core/engine/types';
import { DEFAULT_INTENSITY, type IntensityLevel } from '@/core/intensity/intensity';
import { buildSessionLog } from '@/core/metrics/metrics';
import { getRepositories } from '@/data';

import { useHistoryStore } from './historyStore';
import { useSettingsStore } from './settingsStore';

const TICK_MS = 100;

export interface StartSessionOptions {
  readonly workout: Workout;
  readonly intensity?: IntensityLevel;
  readonly interactionLevel?: InteractionLevel;
}

interface SessionState {
  plan?: SessionPlan;
  snapshot?: SessionSnapshot;
  /** Log produced when the session finished; cleared on `reset`. */
  result?: SessionLog;
  saving: boolean;

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
  stop: () => void;
  reset: () => void;
}

/* Module-level runtime objects – deliberately kept out of React state. */
let engine: SessionEngine | undefined;
let coach: Coach | undefined;
let speech: SpeechPort | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
let unsubscribeSettings: (() => void) | undefined;

function getSpeech(): SpeechPort {
  speech ??= new ExpoSpeech();
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
}

export const useSessionStore = create<SessionState>((set, get) => ({
  plan: undefined,
  snapshot: undefined,
  result: undefined,
  saving: false,

  start: ({ workout, intensity, interactionLevel }) => {
    teardownRuntime();
    const settings = useSettingsStore.getState().settings;
    const repos = getRepositories();
    const lookup = repos.workouts.exerciseLookup();
    const plan = buildSessionPlan(workout, lookup);

    engine = new SessionEngine({
      plan,
      interactionLevel: interactionLevel ?? settings.interactionLevel,
      intensity: intensity ?? DEFAULT_INTENSITY,
    });

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
      coach?.updateSettings(state.settings.locale, state.settings.voice, state.settings.profile.displayName);
      if (state.settings.voice.enabled) coach?.setSpeech(getSpeech());
      else coach?.setSpeech(new SilentSpeech());
    });

    engine.events.on('snapshot', (snapshot) => set({ snapshot }));

    engine.events.on('finished', ({ completed, snapshot }) => {
      if (timer) clearInterval(timer);
      timer = undefined;
      const profile = useSettingsStore.getState().settings.profile;
      const log = buildSessionLog(plan, snapshot, completed, profile, lookup);
      set({ result: log, saving: true });
      useHistoryStore
        .getState()
        .add(log)
        .catch((error) => console.warn('[session] failed to save log', error))
        .finally(() => set({ saving: false }));
    });

    set({ plan, snapshot: engine.snapshot, result: undefined });
    engine.start();
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
  stop: () => engine?.stop(),

  reset: () => {
    teardownRuntime();
    if (get().snapshot || get().plan) {
      set({ plan: undefined, snapshot: undefined, result: undefined, saving: false });
    }
  },
}));

export const selectSnapshot = (s: SessionState) => s.snapshot;
export const selectIsActive = (s: SessionState) =>
  !!s.snapshot && s.snapshot.phase !== 'idle' && s.snapshot.phase !== 'finished';
