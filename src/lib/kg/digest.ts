/**
 * Canonical graph digest.
 *
 * One hash committing to the entire extracted graph. It is the private
 * commitment the ZK circuit proves a threshold over: the verifier learns that a
 * build scoring ≥ the threshold exists behind this digest, and nothing about the
 * layout, the PUE, or the cooling architecture that produced it.
 *
 * Requirements, in order of importance:
 *  1. Deterministic — the same BuildState must always give the same digest, on
 *     any machine, or a proof cannot be checked against a rebuilt graph.
 *  2. Order-independent — object key order and extraction order must not matter.
 *  3. Sensitive — any change to any fact must change the digest.
 *
 * Provenance timestamps are deliberately excluded: they change on every
 * extraction run and say nothing about the design being committed to.
 */

import type { KnowledgeGraph } from './types';

/** A stable JSON encoding: object keys sorted recursively. */
export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`).join(',')}}`;
}

/** Attribute keys carrying extraction time rather than design content. */
const CLOCK_KEYS = new Set(['at', 'updatedAt', 'extractedAt']);

function stripClock(attributes: Record<string, unknown>): Record<string, unknown> {
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attributes)) if (!CLOCK_KEYS.has(key)) kept[key] = value;
  return kept;
}

/**
 * The exact bytes hashed. Exported so a verifier can rebuild the preimage from
 * a graph and confirm a digest without trusting the hashing step.
 */
export function digestPreimage(graph: KnowledgeGraph): string {
  const nodes = Object.values(graph.nodes)
    .map((node) =>
      canonicalize({
        id: node.id,
        type: node.type,
        name: node.name,
        aliases: [...node.aliases].sort(),
        // `at` is the extraction clock, not a property of the design. Event
        // nodes copy it into their attributes for display; hashing it would
        // give the same build a different digest on every run and make any
        // proof over that digest impossible to re-verify.
        attributes: stripClock(node.attributes),
      }),
    )
    .sort();

  const edges = Object.values(graph.edges)
    .map((edge) =>
      canonicalize({
        relation: edge.relation,
        source: edge.sourceId,
        target: edge.targetId,
        attributes: edge.attributes,
      }),
    )
    .sort();

  return `kg/v1\nnodes:${nodes.length}\n${nodes.join('\n')}\nedges:${edges.length}\n${edges.join('\n')}`;
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** TextEncoder may be typed over SharedArrayBuffer; copy into a plain ArrayBuffer for WebCrypto. */
function utf8(input: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(input);
  const bytes = new Uint8Array(encoded.length);
  bytes.set(encoded);
  return bytes.buffer;
}

/**
 * SHA-256 over the canonical preimage, as `0x`-prefixed hex.
 *
 * Uses WebCrypto, which is present in the browser, in Node 20+, and in the
 * Cloudflare Workers runtime — so the same digest can be computed client-side
 * before anything is sent anywhere, which is the point of the privacy story.
 */
export async function graphDigest(graph: KnowledgeGraph): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', utf8(digestPreimage(graph)));
  return `0x${toHex(hash)}`;
}

/** Hashes an arbitrary string with the same primitive; used for ZK commitments. */
export async function sha256Hex(input: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', utf8(input));
  return `0x${toHex(hash)}`;
}
