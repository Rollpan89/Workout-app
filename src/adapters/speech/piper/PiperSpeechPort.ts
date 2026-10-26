import type { SpeechPort, SpeechUtterance } from '@/core/coach/SpeechPort';

import type { PiperVoiceService } from './PiperVoiceService.types';

/**
 * SpeechPort wrapper for the Piper proof of concept. It intentionally mirrors
 * ExpoSpeech's bounded queue and interrupt/drop semantics so the coach can be
 * switched over later without changing its event logic.
 */
export class PiperSpeechPort implements SpeechPort {
  private speaking = false;
  private queue: SpeechUtterance[] = [];
  private readonly maxQueue = 3;
  private sequence = 0;

  constructor(private readonly voice: PiperVoiceService) {}

  speak(utterance: SpeechUtterance): void {
    if (!utterance.text.trim()) {
      utterance.onDone?.();
      return;
    }

    switch (utterance.priority) {
      case 'interrupt': {
        this.queue = [];
        const sequence = ++this.sequence;
        // Treat the pending interruption as active so immediately queued coach
        // lines wait behind it instead of racing the async native stop call.
        this.speaking = true;
        void this.voice
          .stopPlayback()
          .catch((error) => console.warn('[piper] stop failed', error))
          .finally(() => {
            if (sequence === this.sequence) this.speakNow(utterance);
          });
        return;
      }
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
    this.sequence += 1;
    this.speaking = false;
    void this.voice.stopPlayback().catch((error) => console.warn('[piper] stop failed', error));
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  private speakNow(utterance: SpeechUtterance): void {
    const sequence = ++this.sequence;
    this.speaking = true;

    void this.voice
      .speakText(utterance.text, () => sequence === this.sequence)
      .then((result) => this.finish(sequence, utterance, result?.completed ?? false))
      .catch((error) => {
        console.warn('[piper] speech failed', error);
        // Release the coach's held countdown/queue on synthesis errors too.
        this.finish(sequence, utterance, true);
      });
  }

  private finish(sequence: number, utterance: SpeechUtterance, completed: boolean): void {
    if (sequence !== this.sequence) return;
    this.speaking = false;
    if (completed) utterance.onDone?.();
    const next = this.queue.shift();
    if (next) this.speakNow(next);
  }
}
