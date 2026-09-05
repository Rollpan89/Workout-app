import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import type { SpeechPort, SpeechUtterance } from '@/core/coach/SpeechPort';

/** A selectable TTS voice, normalised across platforms. */
export interface VoiceOption {
  readonly id: string;
  readonly name: string;
  /** BCP-47, normalised to dashes ('sv-SE'). */
  readonly language: string;
  readonly quality: 'enhanced' | 'default';
  /** Heuristic 0–100: higher = likely more natural/expressive. */
  readonly score: number;
}

/**
 * Names that identify the newer neural / premium engines on each platform.
 * They are ranked above "enhanced" because they sound dramatically livelier.
 */
const PREMIUM_HINTS = [
  'premium',
  'neural',
  'natural',
  'wavenet',
  'siri', // iOS 17+ exposes Siri voices to AVSpeechSynthesizer on some locales
  'online', // Google "network" voices
  'x-lstm', // Samsung neural
];

/** Voices known to sound flat/robotic – pushed to the bottom. */
const LEGACY_HINTS = ['eloquence', 'espeak', 'pico', 'fred', 'zarvox', 'novelty', 'bells', 'whisper'];

export function rankVoice(v: Speech.Voice): number {
  const name = `${v.name ?? ''} ${v.identifier ?? ''}`.toLowerCase();
  // Bands: legacy 0–10, default 30–45, enhanced 60–70, premium/neural 85–100.
  if (LEGACY_HINTS.some((h) => name.includes(h))) return 5;
  let score = 35;
  if (v.quality === Speech.VoiceQuality.Enhanced) score = 60;
  // NB: expo-speech reports iOS ".premium" voices as quality "Default" (only
  // ".enhanced" maps to Enhanced), so premium must be detected by identifier
  // and always outranks a plain Enhanced voice.
  if (PREMIUM_HINTS.some((h) => name.includes(h))) score = 90;
  // Google's on-device voices come as "sv-se-x-cmh-local"; the "-local" variants are
  // offline-safe – nudge them up so hands-free sessions never stall on network.
  if (name.includes('-local')) score += 5;
  return Math.max(0, Math.min(100, score));
}

/**
 * SpeechPort implementation backed by the device's built-in TTS
 * (AVSpeechSynthesizer on iOS, TextToSpeech on Android, Web Speech API on
 * web) through expo-speech.
 *
 * Adds the priority semantics the coach relies on:
 *  - interrupt → stop whatever is playing and speak immediately
 *  - queue     → speak after the current utterance (bounded queue)
 *  - drop      → speak only if idle
 *
 * Voice selection: the best-ranked voice per language is chosen
 * automatically (premium/neural > enhanced > default > legacy); the user can
 * pin a specific voice via `setPreferredVoice`.
 *
 * A watchdog guarantees the queue keeps draining even if the platform never
 * fires `onDone` (seen on some Android TTS engines).
 */
export class ExpoSpeech implements SpeechPort {
  private speaking = false;
  private queue: SpeechUtterance[] = [];
  private readonly maxQueue = 3;
  private autoVoice: Partial<Record<string, string>> = {};
  private pinnedVoice: Partial<Record<string, string>> = {};
  private voices: VoiceOption[] = [];
  private voicesLoaded: Promise<void>;
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  private utteranceSeq = 0;

  constructor() {
    this.voicesLoaded = this.pickVoices();
  }

  speak(utterance: SpeechUtterance): void {
    switch (utterance.priority) {
      case 'interrupt':
        this.queue = [];
        void this.stopNative();
        this.speakNow(utterance);
        return;
      case 'queue':
        if (this.speaking) {
          if (this.queue.length >= this.maxQueue) this.queue.shift();
          this.queue.push(utterance);
        } else {
          this.speakNow(utterance);
        }
        return;
      case 'drop':
        if (!this.speaking) this.speakNow(utterance);
        return;
    }
  }

  stop(): void {
    this.queue = [];
    this.clearWatchdog();
    void this.stopNative();
    this.speaking = false;
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  /** All voices for a language, best first. Resolves once the platform list is loaded. */
  async listVoices(language: string): Promise<readonly VoiceOption[]> {
    await this.voicesLoaded;
    return this.voices.filter((v) => v.language === language).sort((a, b) => b.score - a.score);
  }

  /** Pin a voice for a language (undefined = back to automatic best pick). */
  setPreferredVoice(language: string, voiceId: string | undefined): void {
    if (voiceId) this.pinnedVoice[language] = voiceId;
    else delete this.pinnedVoice[language];
  }

  /** The voice that will actually be used for a language right now. */
  async resolveVoice(language: string): Promise<VoiceOption | undefined> {
    await this.voicesLoaded;
    const id = this.pinnedVoice[language] ?? this.autoVoice[language];
    return this.voices.find((v) => v.id === id);
  }

  /* ------------------------------------------------------------------ */

  private speakNow(utterance: SpeechUtterance): void {
    this.speaking = true;
    const seq = ++this.utteranceSeq;
    const voice = this.pinnedVoice[utterance.language] ?? this.autoVoice[utterance.language];
    const rate = clamp(utterance.rate ?? 1, 0.5, 2) * platformRateScale();

    this.armWatchdog(seq, estimateDurationMs(utterance.text, rate));

    Speech.speak(utterance.text, {
      language: utterance.language,
      rate,
      pitch: clamp(utterance.pitch ?? 1, 0.5, 2),
      ...(voice ? { voice } : {}),
      onDone: () => this.onFinished(seq),
      onStopped: () => this.onFinished(seq),
      onError: () => this.onFinished(seq),
    });
  }

  /** Only the most recent utterance may advance the queue. */
  private onFinished(seq: number): void {
    if (seq !== this.utteranceSeq) return;
    this.clearWatchdog();
    this.speaking = false;
    const next = this.queue.shift();
    if (next) this.speakNow(next);
  }

  private armWatchdog(seq: number, ms: number): void {
    this.clearWatchdog();
    this.watchdog = setTimeout(() => this.onFinished(seq), ms);
  }

  private clearWatchdog(): void {
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = undefined;
  }

  private async stopNative(): Promise<void> {
    try {
      await Speech.stop();
    } catch {
      /* ignore – nothing was playing */
    }
  }

  /** Load + rank the platform voices; auto-pick the best per supported language. */
  private async pickVoices(): Promise<void> {
    try {
      const raw = await Speech.getAvailableVoicesAsync();
      this.voices = raw
        .filter((v) => !!v.identifier)
        .map((v) => ({
          id: v.identifier,
          name: prettyVoiceName(v),
          language: (v.language ?? '').replace('_', '-'),
          quality: v.quality === Speech.VoiceQuality.Enhanced ? 'enhanced' : 'default',
          score: rankVoice(v),
        }));
      for (const lang of ['sv-SE', 'en-US']) {
        const best = this.voices
          .filter((v) => v.language === lang)
          .sort((a, b) => b.score - a.score)[0];
        if (best) this.autoVoice[lang] = best.id;
      }
    } catch {
      /* voice list unavailable – the engine picks a default per language */
    }
  }
}

function prettyVoiceName(v: Speech.Voice): string {
  const name = v.name ?? v.identifier;
  // iOS: "com.apple.voice.premium.sv-SE.Alva" → "Alva"; Android: "sv-se-x-cmh-local" → keep
  const apple = /com\.apple\.[\w.]*\.([A-Za-z]+)$/.exec(name);
  if (apple?.[1]) return apple[1];
  return name;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** iOS rates run slower than Android/web for the same numeric value. */
function platformRateScale(): number {
  return Platform.OS === 'ios' ? 1.05 : 1;
}

/**
 * Generous upper bound for how long an utterance can take (~14 chars/s at
 * rate 1) plus a fixed margin. Used only as a fallback if `onDone` never fires.
 */
function estimateDurationMs(text: string, rate: number): number {
  const perChar = 1000 / (14 * rate);
  return Math.round(text.length * perChar) + 800;
}
