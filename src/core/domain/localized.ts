/**
 * Localized content primitives.
 *
 * Content (exercise names, workout descriptions, …) is authored in every
 * supported locale up-front so that the coach can speak it natively.
 */
export type Locale = 'sv' | 'en';

export const SUPPORTED_LOCALES: readonly Locale[] = ['sv', 'en'] as const;

export const DEFAULT_LOCALE: Locale = 'sv';

export type LocalizedString = Readonly<Record<Locale, string>>;

/** Convenience constructor: `lz('Knäböj', 'Squat')`. */
export function lz(sv: string, en: string): LocalizedString {
  return { sv, en };
}

/** Resolve a localized string with a safe fallback chain. */
export function resolveLocalized(value: LocalizedString, locale: Locale): string {
  return value[locale] ?? value[DEFAULT_LOCALE] ?? Object.values(value)[0] ?? '';
}

/** BCP-47 tag used for text-to-speech per locale. */
export const SPEECH_LANGUAGE_TAG: Readonly<Record<Locale, string>> = {
  sv: 'sv-SE',
  en: 'en-US',
};
