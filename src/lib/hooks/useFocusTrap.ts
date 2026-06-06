/**
 * Focus trap.
 *
 * Constrains keyboard focus to children of the given element while
 * `active` is true. Used by modal/drawer components (PolicyPanel,
 * WalletPicker).
 */

'use client';

import { useEffect } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap(active: boolean, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const first = root.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(root!.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    root.addEventListener('keydown', handleKey);
    return () => {
      root.removeEventListener('keydown', handleKey);
      previouslyFocused?.focus?.();
    };
  }, [active, ref]);
}

/** Returns true if a screen reader is likely active. */
export function useScreenReader(): boolean {
  if (typeof navigator === 'undefined') return false;
  // No perfect detection; this is a best-effort hint for UI choices.
  return /\b(JAWS|NVDA|VoiceOver|TalkBack)\b/i.test(navigator.userAgent);
}
