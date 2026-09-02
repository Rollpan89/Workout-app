import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import type { SpeechPort, SpeechUtterance } from '@/core/coach/SpeechPort';

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
 * A watchdog guarantees the queue keeps draining even if the platform never
 * fires `onDone` (seen on some Android TTS engines).
 */
export class ExpoSpeech implements SpeechPort {
  private speaking = false;
  private queue: SpeechUtterance[] = [];
  private readonly maxQueue = 3;
  private preferredVoice: Partial<Record<string, string>> = {};
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  private utteranceSeq = 0;

  constructor() {
    void this.pickVoices();
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

  /* ------------------------------------------------------------------ */

  private speakNow(utterance: SpeechUtterance): void {
    this.speaking = true;
    const seq = ++this.utteranceSeq;
    const voice = this.preferredVoice[utterance.language];
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

  /** Prefer an enhanced/premium voice when the platform offers one. */
  private async pickVoices(): Promise<void> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      for (const lang of ['sv-SE', 'en-US']) {
        const candidates = voices.filter((v) => v.language?.replace('_', '-') === lang);
        const enhanced = candidates.find((v) => v.quality === Speech.VoiceQuality.Enhanced);
        const chosen = enhanced ?? candidates[0];
        if (chosen) this.preferredVoice[lang] = chosen.identifier;
      }
    } catch {
      /* voice list unavailable – the engine picks a default per language */
    }
  }
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
