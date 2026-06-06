/**
 * Shared in-memory nonce store.
 *
 * Maps nonce → issuedAt (ms epoch). Entries are GC'd after NONCE_TTL_MS.
 * In production this should be moved to Upstash/Redis so it survives
 * serverless cold starts.
 */

const NONCE_TTL_MS = 10 * 60 * 1000;

const store = new Map<string, number>();

export function recordNonce(nonce: string) {
  store.set(nonce, Date.now());
}

export function consumeNonce(nonce: string): boolean {
  const issued = store.get(nonce);
  if (!issued) return false;
  store.delete(nonce);
  if (Date.now() - issued > NONCE_TTL_MS) return false;
  return true;
}

export function cleanupNonces() {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v > NONCE_TTL_MS) store.delete(k);
  }
}

export { NONCE_TTL_MS };
