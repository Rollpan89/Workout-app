import { WORKOUT_ACCENTS } from '../domain/workout';
import { accent, onAccent } from '../../theme/tokens';

describe('theme accents', () => {
  it('has a tone for every workout accent', () => {
    for (const name of WORKOUT_ACCENTS) {
      expect(accent[name].main).toMatch(/^#[0-9A-F]{6}$/i);
      expect(accent[name].deep).toMatch(/^#[0-9A-F]{6}$/i);
      expect(accent[name].soft).toMatch(/^rgba\(/); // translucent wash
    }
  });

  it('uses dark text on bright accents and white on dark ones', () => {
    expect(onAccent(accent.yellow.main)).toBe('#121214');
    expect(onAccent(accent.lime.main)).toBe('#121214');
    expect(onAccent(accent.cyan.main)).toBe('#121214');
    expect(onAccent(accent.red.main)).toBe('#FFFFFF');
    expect(onAccent(accent.violet.main)).toBe('#FFFFFF');
    // unknown colours fall back to luminance
    expect(onAccent('#FFFFFF')).toBe('#121214');
    expect(onAccent('#101010')).toBe('#FFFFFF');
    expect(onAccent('not-a-colour')).toBe('#FFFFFF');
  });
});
