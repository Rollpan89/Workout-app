import { SPEECH_LANGUAGE_TAG, type Locale } from '@/core/domain/localized';
import type { VoiceSettings } from '@/core/domain/settings';

import { ExpoSpeech } from './ExpoSpeech';

let instance: ExpoSpeech | undefined;

/**
 * App-wide TTS instance. Shared by the session coach and the settings screen
 * so a voice picked in Settings is the one that speaks during the workout.
 */
export function getSpeech(): ExpoSpeech {
  instance ??= new ExpoSpeech();
  return instance;
}

/** Push the user's voice choice into the TTS layer. */
export function applyVoiceSettings(locale: Locale, voice: VoiceSettings): void {
  getSpeech().setPreferredVoice(SPEECH_LANGUAGE_TAG[locale], voice.voiceId);
}
