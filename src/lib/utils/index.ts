/**
 * Utility helpers.
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function formatNumber(n: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat('en-US', options).format(n);
}

export function formatPercent(n: number, fractionDigits = 0) {
  return `${(n * 100).toFixed(fractionDigits)}%`;
}

export function shortAddress(addr: string, head = 4, tail = 4) {
  if (!addr) return '';
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
