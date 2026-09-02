/**
 * Port (interface) for text-to-speech. The coach only talks to this
 * abstraction, which makes it trivial to swap the on-device TTS for a
 * pre-recorded voice pack or a cloud voice later.
 */
export interface SpeechUtterance {
  readonly text: string;
  /** BCP-47 language tag, e.g. 'sv-SE'. */
  readonly language: string;
  readonly rate?: number;
  readonly pitch?: number;
  /**
   * Priority decides what happens when something is already being spoken:
   *  - 'interrupt': stop current speech and speak now (rep counts, "go!")
   *  - 'queue':     wait until current speech has finished (cues, motivation)
   *  - 'drop':      skip if busy (low-value chatter)
   */
  readonly priority: 'interrupt' | 'queue' | 'drop';
}

export interface SpeechPort {
  speak(utterance: SpeechUtterance): void;
  stop(): void;
  /** Whether the engine currently has an utterance in flight. */
  isSpeaking(): boolean;
}

/** No-op implementation used in tests and when voice is disabled. */
export class SilentSpeech implements SpeechPort {
  readonly spoken: SpeechUtterance[] = [];
  speak(utterance: SpeechUtterance): void {
    this.spoken.push(utterance);
  }
  stop(): void {
    /* noop */
  }
  isSpeaking(): boolean {
    return false;
  }
}
