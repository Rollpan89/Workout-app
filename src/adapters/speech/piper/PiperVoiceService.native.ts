import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import {
  DocumentDirectoryPath,
  exists,
  mkdir,
  unlink,
} from '@dr.pogodin/react-native-fs';
import {
  configureBackgroundDownloader,
  deleteModel as deleteDownloadedModel,
  downloadModel,
  getModelPath,
  isModelDownloaded,
  ModelCategory,
  refreshModels,
  type Progress,
} from 'react-native-sherpa-onnx/download';
import { createTTS, saveAudioToFile, type TtsEngine } from 'react-native-sherpa-onnx/tts';

import type {
  PiperCacheProgress,
  PiperModelStatus,
  PiperPlaybackMetrics,
  PiperVoiceService,
} from './PiperVoiceService.types';

/** Piper-compatible Sherpa VITS voice: US English, one male speaker, medium. */
export const PIPER_MODEL_ID = 'vits-piper-en_US-norman-medium';
export const PIPER_MODEL_DOWNLOAD_BYTES = 67_203_672;

interface StaticCue {
  readonly key: string;
  readonly text: string;
}

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
  'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five', 'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine', 'thirty',
] as const;

export const PIPER_STATIC_CUES: readonly StaticCue[] = [
  ...NUMBER_WORDS.map((text, number) => ({ key: `number-${number}`, text })),
  { key: 'go', text: 'Go!' },
  { key: 'last-one', text: 'Last one!' },
  { key: 'last-two', text: 'Two more!' },
  { key: 'get-ready', text: 'Get ready.' },
  { key: 'nice-work', text: 'Nice work.' },
  { key: 'breathe-in', text: 'Breathe in.' },
  { key: 'breathe-out', text: 'Breathe out.' },
];

const CUE_BY_KEY = new Map(PIPER_STATIC_CUES.map((cue) => [cue.key, cue]));
const CUE_BY_TEXT = new Map(PIPER_STATIC_CUES.map((cue) => [normalizeCueText(cue.text), cue]));
const BASE_DIR = `${DocumentDirectoryPath}/pulsecoach/piper/${PIPER_MODEL_ID}`;
const CUE_DIR = `${BASE_DIR}/cues`;
const DYNAMIC_DIR = `${BASE_DIR}/dynamic`;

interface ActivePlayback {
  readonly player: AudioPlayer;
  readonly finish: (completed: boolean) => void;
}

class NativePiperVoiceService implements PiperVoiceService {
  private engine: TtsEngine | undefined;
  private enginePath: string | undefined;
  private enginePromise: Promise<TtsEngine> | undefined;
  private activePlayback: ActivePlayback | undefined;
  private dynamicSequence = 0;

  async getStatus(): Promise<PiperModelStatus> {
    const installed = await isModelDownloaded(ModelCategory.Tts, PIPER_MODEL_ID);
    let cueCount = 0;
    if (await exists(CUE_DIR)) {
      for (const cue of PIPER_STATIC_CUES) {
        if (await exists(this.cuePath(cue.key))) cueCount += 1;
      }
    }
    return { installed, cueCount, cueTotal: PIPER_STATIC_CUES.length };
  }

  async downloadVoice(onProgress: (progress: Progress) => void): Promise<void> {
    // Keep the POC's progress in-app. A custom development APK is foregrounded
    // while downloading, so a background notification is not needed here.
    configureBackgroundDownloader({ showNotificationsEnabled: false, isLogsEnabled: false });
    const models = await refreshModels(ModelCategory.Tts);
    if (!models.some((model) => model.id === PIPER_MODEL_ID)) {
      throw new Error(`The Piper voice ${PIPER_MODEL_ID} is not listed in the Sherpa model registry.`);
    }
    await downloadModel(ModelCategory.Tts, PIPER_MODEL_ID, {
      maxRetries: 2,
      onProgress,
      verifyChecksum: true,
    });
  }

  async removeVoice(): Promise<void> {
    await this.stopPlayback();
    if (this.engine) {
      await this.engine.destroy();
      this.engine = undefined;
      this.enginePath = undefined;
    }
    this.enginePromise = undefined;
    await deleteDownloadedModel(ModelCategory.Tts, PIPER_MODEL_ID);
    await this.removeDirectoryIfPresent(CUE_DIR);
    await this.removeDirectoryIfPresent(DYNAMIC_DIR);
  }

  async prepareCuePack(onProgress: (progress: PiperCacheProgress) => void): Promise<void> {
    const engine = await this.getEngine();
    await this.ensureDirectory(CUE_DIR);

    for (let index = 0; index < PIPER_STATIC_CUES.length; index += 1) {
      const cue = PIPER_STATIC_CUES[index]!;
      const path = this.cuePath(cue.key);
      if (!(await exists(path))) {
        const generated = await engine.generateSpeech(cue.text);
        await saveAudioToFile(generated, path);
      }
      onProgress({ completed: index + 1, total: PIPER_STATIC_CUES.length, text: cue.text });
    }
  }

  async playDynamic(text: string, isCurrent: () => boolean = () => true): Promise<PiperPlaybackMetrics> {
    const cleanText = this.validateText(text);
    const requestStartedAt = Date.now();
    const { path, synthesisMs, durationMs } = await this.synthesizeToFile(cleanText);
    try {
      if (!isCurrent()) {
        return { firstAudioMs: Date.now() - requestStartedAt, synthesisMs, playbackMs: 0, source: 'dynamic', completed: false };
      }
      const playback = await this.playFile(path, cleanText, requestStartedAt, durationMs, isCurrent);
      return { ...playback, synthesisMs, source: 'dynamic' };
    } finally {
      await this.removeFileIfPresent(path);
    }
  }

  async playCue(key: string, isCurrent: () => boolean = () => true): Promise<PiperPlaybackMetrics> {
    const cue = CUE_BY_KEY.get(key);
    if (!cue) throw new Error(`Unknown Piper cue: ${key}`);
    const requestStartedAt = Date.now();
    const path = this.cuePath(cue.key);
    if (!(await exists(path))) throw new Error('Generate the static cue pack before playing these clips.');
    const playback = await this.playFile(path, cue.text, requestStartedAt, estimateDurationMs(cue.text), isCurrent);
    return { ...playback, synthesisMs: 0, source: 'static' };
  }

  async playCountdown(isCurrent: () => boolean = () => true): Promise<PiperPlaybackMetrics[]> {
    const results: PiperPlaybackMetrics[] = [];
    for (const key of ['number-3', 'number-2', 'number-1', 'go']) {
      if (!isCurrent()) break;
      const result = await this.playCue(key, isCurrent);
      results.push(result);
      if (!result.completed) break;
      if (key !== 'go') await delay(180);
    }
    return results;
  }

  async speakText(text: string, isCurrent: () => boolean = () => true): Promise<PiperPlaybackMetrics | undefined> {
    const cleanText = this.validateText(text);
    const requestStartedAt = Date.now();
    const cue = CUE_BY_TEXT.get(normalizeCueText(cleanText));

    if (cue) {
      const path = this.cuePath(cue.key);
      if ((await exists(path)) && isCurrent()) {
        const playback = await this.playFile(path, cue.text, requestStartedAt, estimateDurationMs(cue.text), isCurrent);
        return { ...playback, synthesisMs: 0, source: 'static' };
      }
    }
    if (!isCurrent()) return undefined;

    const generated = await this.synthesizeToFile(cleanText);
    if (!isCurrent()) {
      await this.removeFileIfPresent(generated.path);
      return undefined;
    }

    try {
      const playback = await this.playFile(generated.path, cleanText, requestStartedAt, generated.durationMs, isCurrent);
      return { ...playback, synthesisMs: generated.synthesisMs, source: 'dynamic' };
    } finally {
      await this.removeFileIfPresent(generated.path);
    }
  }

  async stopPlayback(): Promise<void> {
    this.activePlayback?.finish(false);
  }

  private async getEngine(): Promise<TtsEngine> {
    const modelPath = await getModelPath(ModelCategory.Tts, PIPER_MODEL_ID);
    if (!modelPath) throw new Error('Download the Piper voice before synthesizing speech.');

    if (this.engine && this.enginePath === modelPath) return this.engine;
    if (this.enginePromise) return this.enginePromise;

    this.enginePath = modelPath;
    this.enginePromise = createTTS({
      modelPath: { type: 'file', path: modelPath },
      modelType: 'vits',
      numThreads: 2,
      modelOptions: { vits: { noiseScale: 0.667, noiseScaleW: 0.8, lengthScale: 1.0 } },
    })
      .then((engine) => {
        this.engine = engine;
        return engine;
      })
      .finally(() => {
        this.enginePromise = undefined;
      });

    return this.enginePromise;
  }

  private async synthesizeToFile(text: string): Promise<{ path: string; synthesisMs: number; durationMs: number }> {
    const engine = await this.getEngine();
    await this.ensureDirectory(DYNAMIC_DIR);
    const path = `${DYNAMIC_DIR}/line-${Date.now()}-${++this.dynamicSequence}.wav`;
    const startedAt = Date.now();
    const generated = await engine.generateSpeech(text);
    await saveAudioToFile(generated, path);
    return {
      path,
      synthesisMs: Date.now() - startedAt,
      durationMs: Math.round((generated.samples.length / generated.sampleRate) * 1000),
    };
  }

  private async playFile(
    path: string,
    text: string,
    requestStartedAt: number,
    durationMs: number,
    isCurrent: () => boolean = () => true,
  ): Promise<Omit<PiperPlaybackMetrics, 'synthesisMs' | 'source'>> {
    await this.stopPlayback();
    if (!isCurrent()) {
      return { firstAudioMs: Date.now() - requestStartedAt, playbackMs: 0, completed: false };
    }
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
      allowsRecording: false,
    });
    if (!isCurrent()) {
      return { firstAudioMs: Date.now() - requestStartedAt, playbackMs: 0, completed: false };
    }

    return new Promise((resolve, reject) => {
      const player = createAudioPlayer({ uri: toFileUri(path) }, { updateInterval: 80, keepAudioSessionActive: true });
      let settled = false;
      let firstAudioMs: number | undefined;
      const playbackStartedAt = Date.now();
      const timeout = setTimeout(() => finish(true), Math.max(5_000, durationMs * 2 + 2_000));

      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.playing && firstAudioMs === undefined) firstAudioMs = Date.now() - requestStartedAt;
        if (status.didJustFinish) finish(true);
      });

      const finish = (completed: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        subscription.remove();
        if (this.activePlayback?.player === player) this.activePlayback = undefined;
        try {
          player.remove();
        } catch {
          /* already released */
        }
        resolve({
          firstAudioMs: firstAudioMs ?? Math.max(0, Date.now() - requestStartedAt),
          playbackMs: Math.max(0, Date.now() - playbackStartedAt),
          completed,
        });
      };

      this.activePlayback = { player, finish };
      try {
        if (!isCurrent()) {
          finish(false);
          return;
        }
        player.play();
      } catch (error) {
        clearTimeout(timeout);
        subscription.remove();
        this.activePlayback = undefined;
        try {
          player.remove();
        } catch {
          /* ignore */
        }
        reject(error instanceof Error ? error : new Error(`Could not play Piper audio: ${text}`));
      }
    });
  }

  private cuePath(key: string): string {
    return `${CUE_DIR}/${key}.wav`;
  }

  private async ensureDirectory(path: string): Promise<void> {
    if (!(await exists(path))) await mkdir(path);
  }

  private async removeDirectoryIfPresent(path: string): Promise<void> {
    if (await exists(path)) await unlink(path);
  }

  private async removeFileIfPresent(path: string): Promise<void> {
    if (await exists(path)) await unlink(path);
  }

  private validateText(text: string): string {
    const cleanText = text.trim();
    if (!cleanText) throw new Error('Enter a line of text to synthesize.');
    if (cleanText.length > 500) throw new Error('For this POC, keep a test line under 500 characters.');
    return cleanText;
  }
}

let instance: NativePiperVoiceService | undefined;

export function getNativePiperVoiceService(): PiperVoiceService {
  instance ??= new NativePiperVoiceService();
  return instance;
}

export function getPiperCueTotal(): number {
  return PIPER_STATIC_CUES.length;
}

function normalizeCueText(text: string): string {
  return text.trim().toLocaleLowerCase('en-US').replace(/[.!?]+$/g, '');
}

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function estimateDurationMs(text: string): number {
  return Math.max(700, Math.round((text.length / 14) * 1000) + 500);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
