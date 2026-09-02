import { useCallback, useMemo } from 'react';

import { resolveLocalized, type Locale, type LocalizedString } from '@/core/domain';
import { format, getTranslations, type Translations } from '@/i18n';
import { selectLocale, useSettingsStore } from '@/state/settingsStore';

export interface I18n {
  readonly locale: Locale;
  /** Static UI strings for the active locale. */
  readonly t: Translations;
  /** Interpolate `{{param}}` placeholders. */
  readonly f: (template: string, params: Record<string, string | number>) => string;
  /** Resolve content authored in several languages. */
  readonly lz: (value: LocalizedString) => string;
}

export function useI18n(): I18n {
  const locale = useSettingsStore(selectLocale);
  const t = useMemo(() => getTranslations(locale), [locale]);
  const lz = useCallback((value: LocalizedString) => resolveLocalized(value, locale), [locale]);
  return useMemo(() => ({ locale, t, f: format, lz }), [locale, t, lz]);
}
