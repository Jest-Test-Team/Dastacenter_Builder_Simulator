/**
 * Server-side locale detection. Reads the `lang` cookie set by
 * LocaleSwitcher. Falls back to Accept-Language.
 */

import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, type Locale } from './index';

export async function getServerLocale(): Promise<Locale> {
  const c = (await cookies()).get('lang')?.value;
  if (isLocale(c)) return c;
  const accept = (await headers()).get('accept-language') ?? '';
  const primary = accept.split(',')[0]?.split(';')[0]?.trim();
  if (isLocale(primary)) return primary;
  if (primary === 'zh-TW' || primary === 'zh-Hant') return 'zh-TW';
  if (primary?.startsWith('zh')) return 'zh-TW';
  if (primary?.startsWith('ja')) return 'ja';
  return DEFAULT_LOCALE;
}
