import { WORKOUT_ACCENTS } from '../domain/workout';
import { accent, colors, contrastRatio, onAccent } from '../../theme/tokens';

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

describe('theme contrast (WCAG)', () => {
  const surfaces = [colors.bg, colors.surface, colors.surfaceHigh];

  it('keeps every text colour readable on every surface', () => {
    for (const bg of surfaces) {
      expect(contrastRatio(colors.text, bg)).toBeGreaterThanOrEqual(7); // AAA
      expect(contrastRatio(colors.textMuted, bg)).toBeGreaterThanOrEqual(4.5); // AA
      expect(contrastRatio(colors.textDim, bg)).toBeGreaterThanOrEqual(4.5); // AA – was 2.9:1 before
    }
  });

  it('keeps text on accents readable (large text, AA = 3:1)', () => {
    for (const tone of Object.values(accent)) {
      expect(contrastRatio(onAccent(tone.main), tone.main)).toBeGreaterThanOrEqual(3);
    }
    expect(contrastRatio(colors.textOnAccent, colors.red)).toBeGreaterThanOrEqual(3);
    // rest-blue gets dark text via onAccent (white was 2.85:1)
    expect(contrastRatio(onAccent(colors.rest), colors.rest)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(onAccent(colors.orange), colors.orange)).toBeGreaterThanOrEqual(4.5);
  });
});
