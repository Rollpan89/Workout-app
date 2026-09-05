import { rankVoice } from '@/adapters/speech/ExpoSpeech';
import { DEFAULT_SETTINGS, effectiveVoiceParams } from '@/core/domain';

const v = (identifier: string, name: string, quality: 'Default' | 'Enhanced' = 'Default') =>
  ({ identifier, name, language: 'sv-SE', quality }) as unknown as Parameters<typeof rankVoice>[0];

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
    // the picker's "Premium" badge and install hint key off the 60 threshold
    expect(premium).toBeGreaterThanOrEqual(60);
    expect(enhanced).toBeGreaterThanOrEqual(60);
    expect(compact).toBeLessThan(60);
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
