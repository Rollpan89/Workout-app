import { normalizeVoiceList, rankVoice } from '@/adapters/speech/ExpoSpeech';
import { DEFAULT_SETTINGS, effectiveVoiceParams } from '@/core/domain';

const v = (
  identifier: string,
  name: string,
  quality: 'Default' | 'Enhanced' = 'Default',
  language = 'sv-SE',
) => ({ identifier, name, language, quality }) as unknown as Parameters<typeof rankVoice>[0];

describe('voice ranking', () => {
  it('prefers premium/neural voices over enhanced over default over legacy', () => {
    const premium = rankVoice(v('com.apple.voice.premium.sv-SE.Klara', 'Klara', 'Enhanced'));
    const siri = rankVoice(v('com.apple.speech.voice.Siri_sv-SE', 'Siri', 'Default'));
    const enhanced = rankVoice(v('com.apple.voice.enhanced.sv-SE.Alva', 'Alva', 'Enhanced'));
    const google = rankVoice(v('sv-se-x-cmh-local', 'sv-se-x-cmh-local'));
    const compact = rankVoice(v('com.apple.voice.compact.sv-SE.Alva', 'Alva'));
    const eloquence = rankVoice(v('com.apple.eloquence.sv-SE.Eddy', 'Eddy'));

    expect(premium).toBeGreaterThan(enhanced);
    expect(siri).toBeGreaterThan(enhanced);
    expect(enhanced).toBeGreaterThan(google);
    expect(google).toBeGreaterThan(compact);
    expect(compact).toBeGreaterThan(eloquence);
    // Enhanced voices clear the install hint (60+); the Premium tier begins at 85.
    expect(premium).toBeGreaterThanOrEqual(85);
    expect(enhanced).toBeGreaterThanOrEqual(60);
    expect(enhanced).toBeLessThan(85);
    expect(compact).toBeLessThan(60);
  });
});

describe('voice list presentation', () => {
  it('uses readable numbered names for opaque IDs and groups explicit gender hints', () => {
    const voices = normalizeVoiceList([
      v('en-US-x-sfg#female_1-local', 'en-US-x-sfg#female_1-local', 'Default', 'en-US'),
      v('en-US-x-tpf#male_1-local', 'en-US-x-tpf#male_1-local', 'Default', 'en-US'),
    ]);

    expect(voices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Voice 1', nameKind: 'numbered', tier: 'native', gender: 'female', language: 'en-US' }),
        expect.objectContaining({ name: 'Voice 1', nameKind: 'numbered', tier: 'native', gender: 'male', language: 'en-US' }),
      ]),
    );
    expect(voices.every(({ name }) => !name.includes('en-US-x'))).toBe(true);
  });

  it('recognizes named built-in voices without substring-based gender mistakes', () => {
    const [voice] = normalizeVoiceList([
      v('com.apple.voice.enhanced.en-US.Samantha', 'Samantha', 'Enhanced', 'en-US'),
    ]);

    expect(voice?.gender).toBe('female');
    expect(voice?.name).toBe('Samantha');
  });

  it('assigns human names to premium voices whose device names are opaque', () => {
    const voices = normalizeVoiceList([
      v('en-US-x-female-natural', 'en-US-x-female-natural', 'Default', 'en-US'),
      v('en-US-x-male-neural', 'Voice 1', 'Default', 'en-US'),
    ]);

    expect(voices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Maya',
          nameKind: 'premium-alias',
          tier: 'premium',
          gender: 'female',
        }),
        expect.objectContaining({
          name: 'Elias',
          nameKind: 'premium-alias',
          tier: 'premium',
          gender: 'male',
        }),
      ]),
    );
  });

  it('keeps only the highest-ranked Apple quality tier for the same speaker', () => {
    const voices = normalizeVoiceList([
      v('com.apple.voice.compact.sv-SE.Alva', 'Alva'),
      v('com.apple.voice.premium.sv-SE.Alva', 'Alva', 'Enhanced'),
    ]);

    expect(voices).toHaveLength(1);
    expect(voices[0]).toEqual(
      expect.objectContaining({
        id: 'com.apple.voice.premium.sv-SE.Alva',
        name: 'Alva',
        nameKind: 'device',
        tier: 'premium',
        gender: 'female',
      }),
    );
  });

  it('collapses Android local/network variants into one selectable speaker', () => {
    const voices = normalizeVoiceList([
      v('en-US-x-cmh-local', 'en-US-x-cmh-local', 'Default', 'en-US'),
      v('en-US-x-cmh-network', 'en-US-x-cmh-network', 'Default', 'en-US'),
    ]);

    expect(voices).toHaveLength(1);
    expect(voices[0]?.id).toBe('en-US-x-cmh-local');
  });
});

describe('effectiveVoiceParams', () => {
  it('multiplies the user tempo with the energy preset and clamps to the TTS range', () => {
    const base = DEFAULT_SETTINGS.voice;
    expect(effectiveVoiceParams({ ...base, energy: 'calm' })).toEqual({ rate: 0.95, pitch: 1 });
    expect(effectiveVoiceParams({ ...base, energy: 'energetic' })).toEqual({
      rate: 1.1,
      pitch: 1.08,
    });
    expect(effectiveVoiceParams({ ...base, energy: 'hype', rate: 1.25 })).toEqual({
      rate: 1.5,
      pitch: 1.15,
    });
    expect(effectiveVoiceParams({ ...base, energy: 'hype', rate: 2 }).rate).toBe(2);
  });
});
