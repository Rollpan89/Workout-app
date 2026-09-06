import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

/**
 * Audio session for a workout.
 *
 * expo-speech alone does not keep the platform audio session alive: on iOS
 * the session is torn down as soon as an utterance ends, so TTS goes silent
 * a few seconds after the screen locks and other apps are not ducked.
 *
 * This adapter
 *  1. configures the session for coaching: keeps playing in the background,
 *     plays even in silent mode, and *ducks* music from other apps instead of
 *     stopping it;
 *  2. loops a tiny silent track for the duration of the workout so the
 *     session stays active while the screen is locked (the standard
 *     "keep-alive" technique for speech-driven apps);
 *  3. turns the player's periodic status events into engine ticks. Android
 *     freezes every JS timer while the Activity is paused (screen locked or
 *     app in the background – see React Native's JavaTimerManager), but
 *     native events are still delivered to the JS thread. The keep-alive
 *     player therefore doubles as the clock that keeps the SessionEngine
 *     counting with the screen off. iOS keeps timers running in the
 *     background with the audio mode active; there the extra ticks are
 *     simply redundant (`tick()` is idempotent for the same instant).
 *
 * Everything is best-effort: on web or if the native module is missing we
 * simply do nothing, and the coach still works in the foreground.
 */
export interface AudioSessionOptions {
  /** Called on every status event from the keep-alive player (~4×/s). */
  readonly onTick?: () => void;
}

export interface AudioSessionPort {
  /** Call when a workout starts. Idempotent. */
  begin(options?: AudioSessionOptions): Promise<void>;
  /** Call when the workout ends or is abandoned. Idempotent. */
  end(): Promise<void>;
  /** Whether a session is currently held open. */
  isActive(): boolean;
}

const SILENCE = require('../../../assets/audio/silence.wav') as number;

/**
 * Interval between status events, i.e. the background tick period. Rep
 * cadence is ≥ 1 s and TTS latency dwarfs this, so 250 ms is plenty; going
 * lower only costs battery (each event crosses the native → JS boundary).
 */
export const BACKGROUND_TICK_MS = 250;

export class ExpoAudioSession implements AudioSessionPort {
  private player: AudioPlayer | undefined;
  private subscription: { remove(): void } | undefined;
  private active = false;

  async begin(options: AudioSessionOptions = {}): Promise<void> {
    if (this.active || Platform.OS === 'web') return;
    this.active = true;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'duckOthers',
        allowsRecording: false,
      });
      // end() may have been called while we were waiting (start → reset).
      if (!this.active) return;
      const player = createAudioPlayer(SILENCE, { updateInterval: BACKGROUND_TICK_MS });
      player.loop = true;
      player.volume = 0;
      const { onTick } = options;
      if (onTick) {
        this.subscription = player.addListener('playbackStatusUpdate', () => onTick());
      }
      player.play();
      this.player = player;
    } catch (error) {
      console.warn('[audio] could not activate audio session', error);
    }
  }

  async end(): Promise<void> {
    if (!this.active) return;
    this.active = false;
    this.subscription?.remove();
    this.subscription = undefined;
    try {
      this.player?.pause();
      this.player?.remove();
    } catch {
      /* already released */
    }
    this.player = undefined;
    try {
      // Give the music back its full volume.
      await setAudioModeAsync({ shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' });
    } catch {
      /* ignore */
    }
  }

  isActive(): boolean {
    return this.active;
  }
}

/** No-op session for tests, web and when audio is disabled. */
export class NullAudioSession implements AudioSessionPort {
  private active = false;
  async begin(): Promise<void> {
    this.active = true;
  }
  async end(): Promise<void> {
    this.active = false;
  }
  isActive(): boolean {
    return this.active;
  }
}

let instance: AudioSessionPort | undefined;

export function getAudioSession(): AudioSessionPort {
  instance ??= new ExpoAudioSession();
  return instance;
}

/** Test seam. */
export function setAudioSession(session: AudioSessionPort | undefined): void {
  instance = session;
}
