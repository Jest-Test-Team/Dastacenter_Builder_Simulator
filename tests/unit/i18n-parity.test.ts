/**
 * Locale parity.
 *
 * A missing key does not throw — `t()` falls back to English, then to the key
 * itself. That is the right runtime behaviour and the wrong review behaviour:
 * a half-translated screen ships silently, and the only symptom is a stray
 * English sentence someone has to notice. `sim.slogan` had been missing from
 * both zh-TW and ja for exactly that reason.
 *
 * So parity is asserted here instead of hoped for, along with the interpolation
 * placeholders — a translation that drops `{amount}` renders a sentence with a
 * hole in it, and a dividend figure is not a good thing to lose.
 */

import { describe, expect, it } from 'vitest';
import en from '@/lib/i18n/messages/en.json';
import zhTW from '@/lib/i18n/messages/zh-TW.json';
import ja from '@/lib/i18n/messages/ja.json';

const LOCALES: Record<string, Record<string, string>> = { 'zh-TW': zhTW, ja };
const PLACEHOLDER = /\{(\w+)\}/g;

function placeholders(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER)].map((m) => m[1]!).sort();
}

describe('i18n parity', () => {
  it.each(Object.keys(LOCALES))('%s defines every English key', (locale) => {
    const missing = Object.keys(en).filter((key) => !(key in LOCALES[locale]!));
    expect(missing, `missing in ${locale}`).toEqual([]);
  });

  it.each(Object.keys(LOCALES))('%s defines no keys English lacks', (locale) => {
    const extra = Object.keys(LOCALES[locale]!).filter((key) => !(key in en));
    expect(extra, `only in ${locale}`).toEqual([]);
  });

  it.each(Object.keys(LOCALES))('%s keeps every interpolation placeholder', (locale) => {
    const drift: string[] = [];
    for (const [key, value] of Object.entries(en)) {
      const translated = LOCALES[locale]![key];
      if (translated === undefined) continue;
      const expected = placeholders(value);
      const actual = placeholders(translated);
      if (expected.join(',') !== actual.join(',')) {
        drift.push(`${key}: expected {${expected}}, got {${actual}}`);
      }
    }
    expect(drift).toEqual([]);
  });

  it('has no empty translations', () => {
    for (const [locale, messages] of Object.entries(LOCALES)) {
      const empty = Object.entries(messages)
        .filter(([, value]) => value.trim() === '')
        .map(([key]) => key);
      expect(empty, `empty in ${locale}`).toEqual([]);
    }
  });

  it('covers the settlement agent in every locale', () => {
    // The agent is the closing beat of the demo; a stray English line there is
    // the most visible place for one.
    const agentKeys = Object.keys(en).filter((key) => key.startsWith('agent.'));
    expect(agentKeys.length).toBeGreaterThan(10);
    for (const [locale, messages] of Object.entries(LOCALES)) {
      for (const key of agentKeys) {
        expect(messages[key], `${key} in ${locale}`).toBeTruthy();
        expect(messages[key], `${key} in ${locale} is untranslated`).not.toBe(en[key as keyof typeof en]);
      }
    }
  });
});
