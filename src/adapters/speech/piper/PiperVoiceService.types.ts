import type { Progress } from 'react-native-sherpa-onnx/download';

export interface PiperModelStatus {
  readonly installed: boolean;
  readonly cueCount: number;
  readonly cueTotal: number;
}

export interface PiperCacheProgress {
  readonly completed: number;
  readonly total: number;
  readonly text: string;
}

export interface PiperPlaybackMetrics {
  /** Wall time from requesting the line to its first audible playback event. */
  readonly firstAudioMs: number;
  /** Piper inference + writing time; zero for pre-generated cues. */
  readonly synthesisMs: number;
  /** Approximate wall time spent playing the file. */
  readonly playbackMs: number;
  readonly source: 'static' | 'dynamic';
  readonly completed: boolean;
}

export type PiperDownloadProgress = Progress;

/** Runtime interface used by the POC screen and the SpeechPort adapter. */
export interface PiperVoiceService {
  getStatus(): Promise<PiperModelStatus>;
  downloadVoice(onProgress: (progress: PiperDownloadProgress) => void): Promise<void>;
  removeVoice(): Promise<void>;
  prepareCuePack(onProgress: (progress: PiperCacheProgress) => void): Promise<void>;
  playDynamic(text: string, isCurrent?: () => boolean): Promise<PiperPlaybackMetrics>;
  playCue(key: string, isCurrent?: () => boolean): Promise<PiperPlaybackMetrics>;
  playCountdown(isCurrent?: () => boolean): Promise<PiperPlaybackMetrics[]>;
  speakText(text: string, isCurrent?: () => boolean): Promise<PiperPlaybackMetrics | undefined>;
  stopPlayback(): Promise<void>;
}
