import { PiperSpeechPort } from '../PiperSpeechPort';
import type { PiperPlaybackMetrics, PiperVoiceService } from '../PiperVoiceService.types';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

const completed: PiperPlaybackMetrics = {
  firstAudioMs: 0,
  synthesisMs: 0,
  playbackMs: 10,
  source: 'static',
  completed: true,
};

describe('PiperSpeechPort', () => {
  it('queues queue-priority lines, drops low-priority lines while busy, and calls onDone', async () => {
    const first = deferred<PiperPlaybackMetrics>();
    const second = deferred<PiperPlaybackMetrics>();
    const pending = [first, second];
    const spoken: string[] = [];
    const voice = {
      speakText: jest.fn((text: string) => {
        spoken.push(text);
        return pending.shift()!.promise;
      }),
      stopPlayback: jest.fn(() => Promise.resolve()),
    } as unknown as PiperVoiceService;
    const port = new PiperSpeechPort(voice);
    const onFirstDone = jest.fn();
    const onSecondDone = jest.fn();
    const onDroppedDone = jest.fn();

    port.speak({ text: 'First', language: 'en-US', priority: 'interrupt', onDone: onFirstDone });
    port.speak({ text: 'Second', language: 'en-US', priority: 'queue', onDone: onSecondDone });
    port.speak({ text: 'Drop me', language: 'en-US', priority: 'drop', onDone: onDroppedDone });

    expect(port.isSpeaking()).toBe(true);
    expect(spoken).toEqual([]);
    expect(onDroppedDone).not.toHaveBeenCalled();

    await flushMicrotasks();
    expect(spoken).toEqual(['First']);
    first.resolve(completed);
    await flushMicrotasks();
    expect(spoken).toEqual(['First', 'Second']);
    expect(onFirstDone).toHaveBeenCalledTimes(1);

    second.resolve(completed);
    await flushMicrotasks();
    expect(port.isSpeaking()).toBe(false);
    expect(onSecondDone).toHaveBeenCalledTimes(1);
  });

  it('clears queued speech and interrupts the active line for interrupt priority', async () => {
    const first = deferred<PiperPlaybackMetrics>();
    const interrupt = deferred<PiperPlaybackMetrics>();
    const spoken: string[] = [];
    const pending = [first, interrupt];
    const voice = {
      speakText: jest.fn((text: string) => {
        spoken.push(text);
        return pending.shift()!.promise;
      }),
      stopPlayback: jest.fn(() => Promise.resolve()),
    } as unknown as PiperVoiceService;
    const port = new PiperSpeechPort(voice);
    const interruptedDone = jest.fn();
    const queuedDone = jest.fn();
    const urgentDone = jest.fn();

    port.speak({ text: 'Long instruction', language: 'en-US', priority: 'interrupt', onDone: interruptedDone });
    await flushMicrotasks();
    port.speak({ text: 'Queued line', language: 'en-US', priority: 'queue', onDone: queuedDone });
    port.speak({ text: 'Go!', language: 'en-US', priority: 'interrupt', onDone: urgentDone });

    await flushMicrotasks();
    expect(voice.stopPlayback).toHaveBeenCalledTimes(2);
    expect(spoken).toEqual(['Long instruction', 'Go!']);
    expect(queuedDone).not.toHaveBeenCalled();

    interrupt.resolve(completed);
    await flushMicrotasks();
    expect(urgentDone).toHaveBeenCalledTimes(1);
    expect(interruptedDone).not.toHaveBeenCalled();
  });

  it('stop clears queued speech and does not release the interrupted callback', async () => {
    const first = deferred<PiperPlaybackMetrics>();
    const voice = {
      speakText: jest.fn(() => first.promise),
      stopPlayback: jest.fn(() => Promise.resolve()),
    } as unknown as PiperVoiceService;
    const port = new PiperSpeechPort(voice);
    const onDone = jest.fn();

    port.speak({ text: 'Stop this', language: 'en-US', priority: 'interrupt', onDone });
    port.speak({ text: 'Queued', language: 'en-US', priority: 'queue' });
    await flushMicrotasks();
    expect(voice.speakText).toHaveBeenCalledTimes(1);

    port.stop();
    expect(port.isSpeaking()).toBe(false);
    expect(voice.stopPlayback).toHaveBeenCalledTimes(2);
    first.resolve({ ...completed, completed: false });
    await flushMicrotasks();
    expect(onDone).not.toHaveBeenCalled();
  });
});
