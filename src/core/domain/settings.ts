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
  readonly haptics: boolean;
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
