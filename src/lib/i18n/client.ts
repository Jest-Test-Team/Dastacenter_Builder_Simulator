/**
 * Client-side i18n hook. Reads the locale from a server-set cookie so
 * client and server agree.
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import en from './messages/en.json';
import zhTW from './messages/zh-TW.json';
import ja from './messages/ja.json';
import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale, type TFunction } from './index';

const MESSAGES: Record<Locale, Record<string, string>> = { en, 'zh-TW': zhTW, ja };

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m?.[1];
}

function pickClientLocale(): Locale {
  const cookie = readCookie('lang');
  if (isLocale(cookie)) return cookie;
  if (typeof navigator !== 'undefined' && navigator.language) {
    const l = navigator.language;
    if (isLocale(l)) return l;
    if (l === 'zh-TW' || l === 'zh-Hant') return 'zh-TW';
    if (l.startsWith('zh')) return 'zh-TW';
    if (l.startsWith('ja')) return 'ja';
  }
  return DEFAULT_LOCALE;
}

function tFor(locale: Locale): TFunction {
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

export function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  useEffect(() => {
    setLocale(pickClientLocale());
  }, []);
  return locale;
}

export function useT(): TFunction {
  const locale = useLocale();
  return useMemo(() => tFor(locale), [locale]);
}

export function useLocales(): readonly Locale[] {
  return LOCALES;
}
