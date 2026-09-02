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
  textDim: '#6E6E78',
  textOnAccent: '#FFFFFF',

  // Accents
  red: '#FF2A2A',
  redDeep: '#C41414',
  redSoft: 'rgba(255, 42, 42, 0.16)',
  orange: '#FF7A00',
  orangeDeep: '#D65F00',
  orangeSoft: 'rgba(255, 122, 0, 0.16)',
  yellow: '#FFC400',

  // Semantic
  success: '#2ADB7A',
  warning: '#FFC400',
  danger: '#FF2A2A',
  rest: '#2A9DFF',
  restSoft: 'rgba(42, 157, 255, 0.16)',

  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type AccentName = 'red' | 'orange';

export const accent: Record<AccentName, { main: string; deep: string; soft: string }> = {
  red: { main: colors.red, deep: colors.redDeep, soft: colors.redSoft },
  orange: { main: colors.orange, deep: colors.orangeDeep, soft: colors.orangeSoft },
};

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
  hero: { fontFamily: fonts.display, fontSize: 64, lineHeight: 64, letterSpacing: -1 },
  mega: { fontFamily: fonts.display, fontSize: 120, lineHeight: 120, letterSpacing: -3 },
  h1: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 30 },
  h3: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 24 },
  label: { fontFamily: fonts.subheading, fontSize: 14, lineHeight: 16, letterSpacing: 1.5 },
  labelSmall: { fontFamily: fonts.subheading, fontSize: 12, lineHeight: 14, letterSpacing: 1.2 },
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
