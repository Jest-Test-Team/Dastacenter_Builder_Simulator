/**
 * Share-link encoder/decoder.
 *
 * Compresses a build snapshot into a URL-safe string that can be embedded
 * in a query param or hash. The intent: share your build with a friend
 * via a URL, no server needed.
 *
 * For very small builds, we use base64-encoded JSON. For larger builds we
 * use LZ-string compression (lazy-imported to keep bundle small).
 */

import type { BuildSnapshot } from '@/lib/store/build-store';
import type { BuildState } from '@/lib/blocks';

const MAX_URL_SIZE = 1800; // safe under 2KB browser limit

/** A snapshot is any BuildState (pure or live). We tolerate UI fields
 *  being absent by falling back to safe defaults in stripForShare. */
export type ShareInput = BuildSnapshot | BuildState;

/** Encode a build snapshot to a URL-safe string. */
export async function encodeBuildToShareToken(snapshot: ShareInput): Promise<string> {
  const json = JSON.stringify(stripForShare(snapshot as BuildSnapshot));
  // Try LZ-string compression first
  try {
    const LZ = (await import('lz-string')).default;
    const compressed = LZ.compressToEncodedURIComponent(json);
    if (compressed.length <= MAX_URL_SIZE) return `v1.lz.${compressed}`;
  } catch {
    // LZ-string not installed; fall through
  }
  const b64 = typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(json))) : json;
  if (b64.length <= MAX_URL_SIZE) return `v1.b64.${b64}`;
  throw new Error('Build too large to share via URL.');
}

export async function decodeShareToken(token: string): Promise<BuildSnapshot | null> {
  const parts = token.split('.', 3);
  if (parts[0] !== 'v1' || parts.length < 3) return null;
  const [, fmt, payload] = parts;
  if (!fmt || !payload) return null;
  try {
    let json: string;
    if (fmt === 'lz') {
      const LZ = (await import('lz-string')).default;
      json = LZ.decompressFromEncodedURIComponent(payload) ?? '';
    } else if (fmt === 'b64') {
      json = decodeURIComponent(escape(atob(payload)));
    } else {
      return null;
    }
    if (!json) return null;
    return JSON.parse(json) as BuildSnapshot;
  } catch {
    return null;
  }
}

function stripForShare(s: Partial<BuildSnapshot> & Partial<BuildState>) {
  const live = s as Partial<BuildSnapshot> & {
    scenarioName?: string;
    gridSize?: { w: number; h: number; d: number };
    camera?: { position: [number, number, number]; target: [number, number, number]; zoom: number };
    policies?: BuildSnapshot['policies'];
  };
  return {
    buildId: s.buildId ?? '',
    name: s.name ?? 'Untitled build',
    scenarioId: s.scenarioId ?? 'free',
    voxels: s.voxels ?? {},
    byCell: s.byCell ?? {},
    inventory: s.inventory ?? {},
    createdAt: s.createdAt ?? 0,
    updatedAt: s.updatedAt ?? 0,
    shareToken: s.shareToken,
    policies: (live.policies ?? {}) as BuildSnapshot['policies'],
    // UI fields, reset to defaults
    scenarioName: live.scenarioName ?? '',
    gridSize: live.gridSize ?? { w: 32, h: 8, d: 32 },
    mode: 'build',
    selectedInstanceId: null,
    hoveredCell: null,
    activeBlockType: null,
    rotation: 0,
    camera: live.camera ?? { position: [16, 16, 16], target: [0, 0, 0], zoom: 1 },
  };
}

/** Build a shareable URL for a given origin. */
export async function buildShareUrl(
  snapshot: BuildSnapshot,
  origin?: string,
  path = '/build/free',
): Promise<string> {
  const token = await encodeBuildToShareToken(snapshot);
  const o = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${o}${path}?share=${encodeURIComponent(token)}`;
}
