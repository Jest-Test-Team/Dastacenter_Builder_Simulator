/**
 * Encode the current build snapshot into a stable, deterministic
 * string that can be used as a buildId. Hash via Web Crypto.
 */

export async function buildIdFromSnapshot(snapshot: unknown): Promise<string> {
  const text = JSON.stringify(snapshot, replacerStable);
  const data = new TextEncoder().encode(text);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return 'id_' + simpleHash(text);
}

function replacerStable(_k: string, v: unknown) {
  if (v instanceof Map) return Object.fromEntries(v.entries());
  if (v instanceof Set) return Array.from(v.values()).sort();
  if (typeof v === 'bigint') return v.toString();
  return v;
}

function simpleHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, '0');
}
