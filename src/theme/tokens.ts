/**
 * Design tokens – the single source of truth for the "High Energy" look:
 * dark grey base, explosive signal red + orange, slanted shapes, italic
 * condensed sport typography and thick progress bars.
 */
export const colors = {
  // Base
  bg: '#121214',
  bgElevated: '#1B1B1F',
  surface: '#232328',
  surfaceHigh: '#2C2C33',
  border: '#34343C',
  borderStrong: '#45454F',

  // Text
  text: '#F5F5F7',
  textMuted: '#A5A5AF',
  textDim: '#92929E', // ≥ 4.5:1 on bg/surface/surfaceHigh (WCAG AA for small text)
  textOnAccent: '#FFFFFF',

  // Accents
  red: '#FF2A2A',
  redDeep: '#C41414',
  redSoft: 'rgba(255, 42, 42, 0.16)',
  orange: '#FF7A00',
  orangeDeep: '#D65F00',
  orangeSoft: 'rgba(255, 122, 0, 0.16)',
  yellow: '#FFC400',
  yellowDeep: '#D19E00',
  yellowSoft: 'rgba(255, 196, 0, 0.16)',
  lime: '#B6FF2A',
  limeDeep: '#7FC400',
  limeSoft: 'rgba(182, 255, 42, 0.16)',
  cyan: '#2AE6FF',
  cyanDeep: '#00B3CC',
  cyanSoft: 'rgba(42, 230, 255, 0.16)',
  violet: '#8A5CFF',
  violetDeep: '#5E33D6',
  violetSoft: 'rgba(138, 92, 255, 0.16)',
  magenta: '#FF2AC6',
  magentaDeep: '#C4148F',
  magentaSoft: 'rgba(255, 42, 198, 0.16)',

  // Semantic
  success: '#2ADB7A',
  warning: '#FFC400',
  danger: '#FF2A2A',
  rest: '#2A9DFF',
  restSoft: 'rgba(42, 157, 255, 0.16)',

  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type AccentName = 'red' | 'orange' | 'yellow' | 'lime' | 'cyan' | 'violet' | 'magenta';

export interface AccentTone {
  main: string;
  deep: string;
  soft: string;
  /** Text colour that stays readable on `main`. */
  on: string;
}

export const accent: Record<AccentName, AccentTone> = {
  red: { main: colors.red, deep: colors.redDeep, soft: colors.redSoft, on: '#FFFFFF' },
  orange: { main: colors.orange, deep: colors.orangeDeep, soft: colors.orangeSoft, on: '#121214' }, // white was 2.6:1
  yellow: { main: colors.yellow, deep: colors.yellowDeep, soft: colors.yellowSoft, on: '#121214' },
  lime: { main: colors.lime, deep: colors.limeDeep, soft: colors.limeSoft, on: '#121214' },
  cyan: { main: colors.cyan, deep: colors.cyanDeep, soft: colors.cyanSoft, on: '#121214' },
  violet: { main: colors.violet, deep: colors.violetDeep, soft: colors.violetSoft, on: '#FFFFFF' },
  magenta: { main: colors.magenta, deep: colors.magentaDeep, soft: colors.magentaSoft, on: '#FFFFFF' },
};

/** Readable text colour for an arbitrary accent hex (falls back to white). */
export function onAccent(hex: string): string {
  const tone = Object.values(accent).find((a) => a.main === hex || a.deep === hex);
  if (tone) return tone.on;
  if (!/^#?([0-9a-f]{6})$/i.test(hex)) return '#FFFFFF';
  // Pick whichever of dark/white gives the higher WCAG contrast. White wins
  // ties in the saturated mid-range (red, violet) where it looks better and
  // still clears 3:1 for the large, bold type used on accent fills.
  const dark = contrastRatio('#121214', hex);
  const white = contrastRatio('#FFFFFF', hex);
  return dark > white * 1.15 ? '#121214' : '#FFFFFF';
}

/** WCAG 2.x relative luminance of a #RRGGBB colour. */
export function relativeLuminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1]!, 16);
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio (1–21) between two #RRGGBB colours. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 14,
  xl: 22,
  pill: 999,
} as const;

/** Signature slant used for skewed blocks and progress bars (degrees). */
export const SLANT_DEG = -12;
export const SLANT = `${SLANT_DEG}deg`;

export const fonts = {
  display: 'BarlowCondensed_900Black_Italic',
  displayUpright: 'BarlowCondensed_900Black',
  heading: 'BarlowCondensed_700Bold_Italic',
  headingUpright: 'BarlowCondensed_700Bold',
  subheading: 'BarlowCondensed_600SemiBold',
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodyBold: 'Barlow_700Bold',
  mono: 'BarlowCondensed_600SemiBold',
} as const;

export const typography = {
  hero: { fontFamily: fonts.display, fontSize: 64, lineHeight: 64, },
  mega: { fontFamily: fonts.display, fontSize: 120, lineHeight: 120, },
  h1: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42, },
  h2: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 30 },
  h3: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 24 },
  label: { fontFamily: fonts.subheading, fontSize: 14, lineHeight: 16,  },
  labelSmall: { fontFamily: fonts.subheading, fontSize: 12, lineHeight: 14,  },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  bodySmall: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19 },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22 },
  stat: { fontFamily: fonts.displayUpright, fontSize: 34, lineHeight: 36 },
} as const;

export const shadows = {
  glowRed: {
    shadowColor: colors.red,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  glowOrange: {
    shadowColor: colors.orange,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
} as const;

export const theme = { colors, accent, spacing, radius, fonts, typography, shadows } as const;

export type Theme = typeof theme;
