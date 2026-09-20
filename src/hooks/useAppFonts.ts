import {
  Barlow_400Regular,
  Barlow_400Regular_Italic,
  Barlow_500Medium,
  Barlow_500Medium_Italic,
  Barlow_700Bold,
  Barlow_700Bold_Italic,
} from '@expo-google-fonts/barlow';
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_600SemiBold_Italic,
  BarlowCondensed_700Bold,
  BarlowCondensed_700Bold_Italic,
  BarlowCondensed_900Black,
  BarlowCondensed_900Black_Italic,
} from '@expo-google-fonts/barlow-condensed';
import { useFonts } from 'expo-font';

/**
 * Every face the theme can ask for. Exported so tests can assert that no token
 * in `theme/tokens.ts` points at a file we forgot to load (that is exactly how
 * a button ended up with a synthesised slant instead of the real italic).
 */
export const APP_FONTS = {
  Barlow_400Regular,
  Barlow_400Regular_Italic,
  Barlow_500Medium,
  Barlow_500Medium_Italic,
  Barlow_700Bold,
  Barlow_700Bold_Italic,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_600SemiBold_Italic,
  BarlowCondensed_700Bold,
  BarlowCondensed_700Bold_Italic,
  BarlowCondensed_900Black,
  BarlowCondensed_900Black_Italic,
} as const;

/** Loads exactly the font weights referenced in `theme/tokens.ts`. */
export function useAppFonts(): [boolean, Error | null] {
  return useFonts(APP_FONTS);
}
