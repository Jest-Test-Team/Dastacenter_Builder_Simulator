/**
 * "Skip to main content" link.
 *
 * Visible only on focus. Required for WCAG 2.4.1 (Bypass Blocks).
 * Targets `#main` which every page should set on its <main>.
 */

'use client';

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[9999] focus:rounded focus:bg-primary focus:px-3 focus:py-1.5 focus:text-fg"
    >
      Skip to main content
    </a>
  );
}
