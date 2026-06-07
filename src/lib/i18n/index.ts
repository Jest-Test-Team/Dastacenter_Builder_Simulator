/**
 * Tiny i18n.
 *
 * Returns the right translation function for a locale. We support
 * en (default), zh-TW, and ja. Keys fall back to en if missing.
 *
 * This is intentionally not next-intl — that would require us to
 * restructure the app router. v1's 3-locale support is served by a
 * locale switcher that sets a cookie and the page server-renders
 * with the right bundle.
 */

import en from './messages/en.json';
import zhTW from './messages/zh-TW.json';
import ja from './messages/ja.json';

export type Locale = 'en' | 'zh-TW' | 'ja';

const MESSAGES: Record<Locale, Record<string, string>> = { en, 'zh-TW': zhTW, ja };

export const LOCALES: Locale[] = ['en', 'zh-TW', 'ja'];
export const LOCALE_LABELS: Record<Locale, string> = { en: 'English', 'zh-TW': '繁體中文', ja: '日本語' };
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(s: string | undefined | null): s is Locale {
  return !!s && (LOCALES as string[]).includes(s);
}

export function pickLocale(input: string | undefined | null, cookie?: string): Locale {
  if (isLocale(input)) return input;
  if (isLocale(cookie)) return cookie as Locale;
  return DEFAULT_LOCALE;
}

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

export function createT(locale: Locale): TFunction {
  const messages = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
  const fallback = MESSAGES[DEFAULT_LOCALE];
  return function t(key: string, vars?: Record<string, string | number>): string {
    let s = messages[key] ?? fallback[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return s;
  };
}

export function getMessages(locale: Locale): Record<string, string> {
  return MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
}
