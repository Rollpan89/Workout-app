import type { Locale } from '@/core/domain';

import { en } from './en';
import { sv, type Translations } from './sv';

export type { Translations };

export const TRANSLATIONS: Readonly<Record<Locale, Translations>> = { sv, en };

export function getTranslations(locale: Locale): Translations {
  return TRANSLATIONS[locale] ?? sv;
}

/** Tiny interpolation helper: `format('Set {{set}} of {{total}}', { set: 1, total: 3 })`. */
export function format(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(params[key] ?? ''));
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
