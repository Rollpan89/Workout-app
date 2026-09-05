import type { Locale } from './localized';
import type { WorkoutGoal } from './workout';

/**
 * How much the app asks the user to touch the screen during a session.
 *
 * - handsFree: the coach runs everything on its own timer. The user never
 *   needs to touch the screen; the session flows from set to set.
 * - assisted:  the coach counts, but waits for a tap before starting each
 *   new set (useful when changing weights).
 * - manual:    the coach only announces the exercise; the user taps each
 *   rep / marks each set done themselves.
 */
export type InteractionLevel = 'handsFree' | 'assisted' | 'manual';

export const INTERACTION_LEVELS: readonly InteractionLevel[] = [
  'handsFree',
  'assisted',
  'manual',
] as const;

export type Sex = 'female' | 'male' | 'unspecified';

export interface UserProfile {
  readonly displayName: string;
  readonly bodyweightKg: number;
  readonly sex: Sex;
  readonly goal: WorkoutGoal;
}

export interface VoiceSettings {
  readonly enabled: boolean;
  /** Speech rate multiplier passed to the TTS engine (0.5 – 2.0). */
  readonly rate: number;
  readonly pitch: number;
  /** Count every rep out loud vs. only announce milestones. */
  readonly countEveryRep: boolean;
  /** Extra motivational lines between sets. */
  readonly motivation: boolean;
  /** Technique cues interleaved between reps ("knäna utåt"). */
  readonly techniqueCues: boolean;
  /** Tempo words ("ner… upp") on slow strength movements. */
  readonly tempoCues: boolean;
  /** Say which exercise comes next *before* the rest starts (when it changes). */
  readonly announceNext: boolean;
  /** Tips for the upcoming exercise during the rest: none, one, or all key points. */
  readonly restTips: RestTipsLevel;
  /** Voice identifier chosen by the user (platform-specific), undefined = auto. */
  readonly voiceId?: string;
  /** Energy preset – tunes rate/pitch together. */
  readonly energy: VoiceEnergy;
  readonly haptics: boolean;
}

export type RestTipsLevel = 'off' | 'one' | 'full';
export const REST_TIPS_LEVELS: readonly RestTipsLevel[] = ['off', 'one', 'full'];

export type VoiceEnergy = 'calm' | 'energetic' | 'hype';
export const VOICE_ENERGIES: readonly VoiceEnergy[] = ['calm', 'energetic', 'hype'];

/** Rate/pitch per energy preset. Rate is the user-facing base; the adapter scales per platform. */
export const VOICE_ENERGY_PRESETS: Readonly<Record<VoiceEnergy, { rate: number; pitch: number }>> = {
  calm: { rate: 0.95, pitch: 1.0 },
  energetic: { rate: 1.1, pitch: 1.08 },
  hype: { rate: 1.2, pitch: 1.15 },
};

/** Rate/pitch actually sent to the TTS: user tempo × energy preset. */
export function effectiveVoiceParams(voice: VoiceSettings): { rate: number; pitch: number } {
  const preset = VOICE_ENERGY_PRESETS[voice.energy] ?? VOICE_ENERGY_PRESETS.energetic;
  return {
    rate: Math.min(2, Math.max(0.5, voice.rate * preset.rate)),
    pitch: Math.min(2, Math.max(0.5, voice.pitch * preset.pitch)),
  };
}

export interface AppSettings {
  readonly locale: Locale;
  readonly interactionLevel: InteractionLevel;
  readonly voice: VoiceSettings;
  readonly profile: UserProfile;
  readonly keepScreenAwake: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  locale: 'sv',
  interactionLevel: 'handsFree',
  voice: {
    enabled: true,
    rate: 1.0,
    pitch: 1.0,
    countEveryRep: true,
    motivation: true,
    techniqueCues: true,
    tempoCues: true,
    announceNext: true,
    restTips: 'one',
    energy: 'energetic',
    haptics: true,
  },
  profile: {
    displayName: '',
    bodyweightKg: 75,
    sex: 'unspecified',
    goal: 'strength',
  },
  keepScreenAwake: true,
};
