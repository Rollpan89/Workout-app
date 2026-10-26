import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import type { SpeechPort, SpeechUtterance } from '@/core/coach/SpeechPort';

/** A selectable TTS voice, normalised across platforms. */
export type VoiceGender = 'female' | 'male' | 'unknown';
export type VoiceTier = 'native' | 'premium';
export type VoiceNameKind = 'device' | 'numbered' | 'premium-alias';

export interface VoiceOption {
  readonly id: string;
  readonly name: string;
  /** How the displayed name was obtained or assigned. */
  readonly nameKind: VoiceNameKind;
  /** Best-effort classification; unknown voices remain available in their own group. */
  readonly gender: VoiceGender;
  /** Device-default voices remain native; neural/premium-ranked voices are premium. */
  readonly tier: VoiceTier;
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

/** Scores 85+ come from explicit premium/neural voice hints; Enhanced stays native. */
const PREMIUM_SCORE_THRESHOLD = 85;

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
 * Make the native voice list usable in the picker. Expo exposes names and IDs,
 * but no acoustic similarity data, so we only collapse obvious variants of
 * the same speaker (Apple quality tiers and Android local/network copies).
 * Generic premium names receive stable human aliases; enhanced-but-standard
 * device voices remain in the native tier.
 */
export function normalizeVoiceList(raw: readonly Speech.Voice[]): VoiceOption[] {
  const candidates = raw
    .filter((voice) => typeof voice.identifier === 'string' && voice.identifier.trim().length > 0)
    .map((voice) => {
      const name = prettyVoiceName(voice);
      const score = rankVoice(voice);
      return {
        id: voice.identifier,
        name,
        language: normalizeLanguageTag(voice.language ?? ''),
        quality: voice.quality === Speech.VoiceQuality.Enhanced ? ('enhanced' as const) : ('default' as const),
        score,
        tier: score >= PREMIUM_SCORE_THRESHOLD ? ('premium' as const) : ('native' as const),
        gender: classifyVoiceGender(voice),
        familyKey: voiceFamilyKey(voice, name),
      };
    })
    .filter((voice) => voice.language.length > 0)
    .sort((a, b) => b.score - a.score || (a.name ?? a.id).localeCompare(b.name ?? b.id));

  const seenFamilies = new Set<string>();
  const unique: (typeof candidates)[number][] = [];
  for (const voice of candidates) {
    const family = `${voice.language.toLowerCase()}:${voice.familyKey}`;
    if (seenFamilies.has(family)) continue;
    seenFamilies.add(family);
    unique.push(voice);
  }

  const namesUsedByLanguage = new Map<string, Set<string>>();
  const usedNames = (language: string) => {
    const existing = namesUsedByLanguage.get(language);
    if (existing) return existing;
    const created = new Set<string>();
    namesUsedByLanguage.set(language, created);
    return created;
  };
  for (const voice of unique) {
    if (voice.name) usedNames(voice.language).add(normalizeSpeakerName(voice.name));
  }

  const generatedNameCount = new Map<string, Record<VoiceGender, number>>();
  return unique.map(({ familyKey: _familyKey, ...voice }) => {
    if (voice.name) return { ...voice, name: voice.name, nameKind: 'device' as const };
    const reservedNames = usedNames(voice.language);
    if (voice.tier === 'premium') {
      return {
        ...voice,
        name: nextPremiumHumanName(voice.gender, reservedNames),
        nameKind: 'premium-alias' as const,
      };
    }

    const counts = generatedNameCount.get(voice.language) ?? { female: 0, male: 0, unknown: 0 };
    const number = ++counts[voice.gender];
    generatedNameCount.set(voice.language, counts);
    return { ...voice, name: `Voice ${number}`, nameKind: 'numbered' as const };
  });
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

    this.armWatchdog(seq, utterance, estimateDurationMs(utterance.text, rate));

    Speech.speak(utterance.text, {
      language: utterance.language,
      rate,
      pitch: clamp(utterance.pitch ?? 1, 0.5, 2),
      ...(voice ? { voice } : {}),
      onDone: () => this.onFinished(seq, utterance, true),
      // A deliberate stop (pause, a new high-priority line) must not release
      // an announcement that was waiting to start its countdown.
      onStopped: () => this.onFinished(seq, utterance, false),
      onError: () => this.onFinished(seq, utterance, true),
    });
  }

  /** Only the most recent utterance may advance the queue. */
  private onFinished(seq: number, utterance: SpeechUtterance, completed: boolean): void {
    if (seq !== this.utteranceSeq) return;
    this.clearWatchdog();
    this.speaking = false;
    if (completed) utterance.onDone?.();
    const next = this.queue.shift();
    if (next) this.speakNow(next);
  }

  private armWatchdog(seq: number, utterance: SpeechUtterance, ms: number): void {
    this.clearWatchdog();
    this.watchdog = setTimeout(() => this.onFinished(seq, utterance, true), ms);
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
      this.voices = normalizeVoiceList(raw);
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

const FEMALE_SPEAKER_NAMES = new Set([
  'alva', 'allison', 'ava', 'fiona', 'flo', 'ingrid', 'joanna', 'joelle', 'karen', 'kathy', 'kendra',
  'kimberly', 'klara', 'moira', 'nicky', 'salli', 'samantha', 'serena', 'shelley', 'susan', 'tessa',
  'victoria', 'zoe',
]);

const MALE_SPEAKER_NAMES = new Set([
  'alex', 'albert', 'bruce', 'daniel', 'david', 'diego', 'eddy', 'fred', 'guy', 'henry', 'james',
  'john', 'kevin', 'lee', 'liam', 'luca', 'matthew', 'oliver', 'oskar', 'ralph', 'rishi', 'reed',
  'rocko', 'tom', 'yuri',
]);

const PREMIUM_HUMAN_NAMES: Record<VoiceGender, readonly string[]> = {
  female: ['Maya', 'Nora', 'Sofia', 'Emma', 'Mila', 'Clara', 'Lena', 'Eva'],
  male: ['Elias', 'Leo', 'Noah', 'Liam', 'Oliver', 'Felix', 'Oscar', 'Adam'],
  unknown: ['Alex', 'Riley', 'Sam', 'Taylor', 'Jordan', 'Casey', 'Avery', 'Robin'],
};

function nextPremiumHumanName(gender: VoiceGender, usedNames: Set<string>): string {
  const candidates = PREMIUM_HUMAN_NAMES[gender];
  const unused = candidates.find((candidate) => !usedNames.has(normalizeSpeakerName(candidate)));
  if (unused) {
    usedNames.add(normalizeSpeakerName(unused));
    return unused;
  }

  const base = candidates[0] ?? 'Alex';
  let suffix = 2;
  let name = `${base} ${suffix}`;
  while (usedNames.has(normalizeSpeakerName(name))) {
    name = `${base} ${++suffix}`;
  }
  usedNames.add(normalizeSpeakerName(name));
  return name;
}

/** Best-effort gender metadata from the engine, identifier, or well-known voice names. */
export function classifyVoiceGender(voice: Speech.Voice): VoiceGender {
  const nativeGender = (voice as Speech.Voice & { gender?: unknown }).gender;
  if (nativeGender === 1) return 'male'; // AVSpeechSynthesisVoiceGenderMale
  if (nativeGender === 2) return 'female'; // AVSpeechSynthesisVoiceGenderFemale
  if (typeof nativeGender === 'string') {
    const metadataGender = genderFromText(nativeGender);
    if (metadataGender !== 'unknown') return metadataGender;
  }

  const explicitGender = genderFromText(`${voice.identifier ?? ''} ${voice.name ?? ''}`);
  if (explicitGender !== 'unknown') return explicitGender;

  const speaker = appleSpeakerName(voice.identifier) ?? prettyVoiceName(voice);
  const key = normalizeSpeakerName(speaker ?? '');
  if (FEMALE_SPEAKER_NAMES.has(key)) return 'female';
  if (MALE_SPEAKER_NAMES.has(key)) return 'male';
  return 'unknown';
}

function genderFromText(value: string): VoiceGender {
  const text = value.toLowerCase();
  if (/female|woman|feminine/.test(text)) return 'female';
  // Keep this token-based: matching "man" as a substring would misclassify
  // names such as Samantha or Amanda as male.
  if (/male|masculine/.test(text) || /(?:^|[^a-z])man(?:$|[^a-z])/.test(text)) return 'male';
  return 'unknown';
}

function prettyVoiceName(voice: Speech.Voice): string | undefined {
  const identifier = voice.identifier ?? '';
  const rawName = (voice.name ?? '').trim();
  const cleanedName = cleanVoiceDisplayName(rawName);
  if (
    cleanedName &&
    !isOpaqueVoiceName(cleanedName, identifier) &&
    !isGenericVoiceName(cleanedName)
  ) {
    return cleanedName;
  }
  return appleSpeakerName(identifier);
}

function cleanVoiceDisplayName(value: string): string {
  return value
    .replace(/\s*\((?:premium|enhanced|compact|default|local|network|offline)\)\s*/gi, ' ')
    .replace(/^google tts[:\s-]*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isOpaqueVoiceName(name: string, identifier: string): boolean {
  if (!name || name.toLowerCase() === identifier.toLowerCase()) return true;
  return (
    /^com\./i.test(name) ||
    /^[a-z]{2,3}[-_][a-z]{2,4}(?:[-_][a-z0-9#]+)*$/i.test(name) ||
    /^[a-z]{2,3}[-_][a-z]{2,4}#[a-z0-9_-]+$/i.test(name)
  );
}

function isGenericVoiceName(name: string): boolean {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const languageLabel = normalized.replace(/\s+\d+$/, '');
  return (
    /^(?:(?:female|male|neutral) )?(?:voice|speaker|tts)(?: \d+)?$/.test(normalized) ||
    /^(?:(?:google )?(?:(?:us|uk|united states|united kingdom|australian|british) )?english(?: (?:us|uk|united states|united kingdom|australian|british))?(?: (?:female|male|premium|enhanced|default))?)$/.test(
      languageLabel,
    ) ||
    /^(?:swedish|svenska)(?: (?:sweden|sverige))?(?: (?:female|male|premium|enhanced|default))?$/.test(
      languageLabel,
    )
  );
}

function appleSpeakerName(identifier: string): string | undefined {
  if (!identifier.toLowerCase().startsWith('com.apple.')) return undefined;
  const lastPart = identifier.split('.').at(-1)?.trim();
  if (!lastPart) return undefined;
  const speaker = lastPart.replace(/[_-][a-z]{2,3}[-_][a-z]{2,4}$/i, '');
  if (!speaker || /^[a-z]{2,3}[-_][a-z]{2,4}$/i.test(speaker)) return undefined;
  return speaker.replace(/[_-]+/g, ' ').replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function voiceFamilyKey(voice: Speech.Voice, name: string | undefined): string {
  const identifier = (voice.identifier ?? '').trim().toLowerCase();
  const appleSpeaker = appleSpeakerName(voice.identifier ?? '');
  if (appleSpeaker) return `apple:${normalizeSpeakerName(appleSpeaker)}`;

  // Google/Android IDs encode the voice family; local and network are delivery
  // variants of that family rather than separate voices.
  if (/-x-|_x-/.test(identifier)) return `engine:${normalizeVoiceFamilyId(identifier)}`;
  if (name && !isGenericVoiceName(name)) return `name:${normalizeSpeakerName(name)}`;
  return `id:${normalizeVoiceFamilyId(identifier)}`;
}

function normalizeVoiceFamilyId(identifier: string): string {
  return identifier
    .toLowerCase()
    .replace(/[-_.](?:local|network|online|offline|premium|enhanced|compact|default)$/i, '')
    .replace(/\s+/g, '');
}

function normalizeSpeakerName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeLanguageTag(language: string): string {
  return language
    .replace(/_/g, '-')
    .split('-')
    .map((part, index) => (index === 0 ? part.toLowerCase() : part.length === 2 ? part.toUpperCase() : part))
    .join('-');
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
