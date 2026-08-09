/**
 * Tests against the REAL compiled Compact circuit.
 *
 * Everything in `zk-prover.test.ts` runs against MockProver, which reproduces the
 * interface but proves nothing. This file loads the artefacts that `compactc`
 * actually produced from `circuits/datacenter-score.compact` and executes the
 * circuit's own code, so the security properties are checked where they live
 * rather than in a TypeScript imitation of them.
 *
 * `openCommitment` is a **pure** circuit — the compiler reports
 * `"pure": true, "proof": false` — so it runs locally with no proof server and
 * no Docker. That is what makes these assertions possible in an ordinary test
 * run. Generating a `proveThreshold` proof still needs the proof server, and is
 * not attempted here.
 *
 * The suite skips itself when `circuits/build` is absent, so a checkout without
 * the Compact toolchain still gets a green run. Compile with `npm run zk:compile`.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CIRCUIT_ID } from '@/lib/zk';

const BUILD_DIR = path.resolve(__dirname, '../../circuits/build');
const CONTRACT_ENTRY = path.join(BUILD_DIR, 'contract/index.js');
const INFO = path.join(BUILD_DIR, 'compiler/contract-info.json');
const compiled = existsSync(CONTRACT_ENTRY) && existsSync(INFO);

const bytes32 = (label: string): Uint8Array => {
  const buffer = new Uint8Array(32);
  buffer.set(new TextEncoder().encode(label).slice(0, 32));
  return buffer;
};
const hex = (value: Uint8Array) => [...value].map((b) => b.toString(16).padStart(2, '0')).join('');

interface ContractInfo {
  'compiler-version': string;
  'language-version': string;
  circuits: Array<{
    name: string;
    pure: boolean;
    proof: boolean;
    arguments: Array<{ name: string; type: { 'type-name': string; length?: number; maxval?: number } }>;
  }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pureCircuits: any;
let info: ContractInfo;

if (compiled) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  pureCircuits = require(CONTRACT_ENTRY).pureCircuits;
  info = JSON.parse(readFileSync(INFO, 'utf8')) as ContractInfo;
}

describe.skipIf(!compiled)('compiled circuit: artefacts', () => {
  it('was produced by a known compiler and language version', () => {
    expect(info['compiler-version']).toMatch(/^\d+\.\d+\.\d+$/);
    // The source pragma must match what the compiler accepted, or the next
    // `compact update` silently stops compiling this file.
    const source = readFileSync(path.resolve(__dirname, '../../circuits/datacenter-score.compact'), 'utf8');
    const pragma = source.match(/pragma language_version ([\d.]+)/)?.[1];
    expect(info['language-version'].startsWith(pragma!)).toBe(true);
  });

  it('emits proving and verifying keys for the threshold circuit', () => {
    expect(existsSync(path.join(BUILD_DIR, 'keys/proveThreshold.prover'))).toBe(true);
    expect(existsSync(path.join(BUILD_DIR, 'keys/proveThreshold.verifier'))).toBe(true);
    expect(existsSync(path.join(BUILD_DIR, 'zkir/proveThreshold.zkir'))).toBe(true);
  });
});

describe.skipIf(!compiled)('compiled circuit: the statement shape TypeScript assumes', () => {
  it('proves the threshold with a proof, and opens commitments without one', () => {
    const prove = info.circuits.find((c) => c.name === 'proveThreshold')!;
    const open = info.circuits.find((c) => c.name === 'openCommitment')!;
    expect(prove.proof).toBe(true);
    // Selective disclosure must not require a prover; if this ever flips, the
    // "hand an auditor the witness" flow silently starts needing infrastructure.
    expect(open.pure).toBe(true);
    expect(open.proof).toBe(false);
  });

  it('takes exactly the public arguments the adapter sends', () => {
    const prove = info.circuits.find((c) => c.name === 'proveThreshold')!;
    expect(prove.arguments.map((a) => a.name)).toEqual(['claimedThreshold', 'packVersion']);
    expect(prove.arguments[0]!.type['type-name']).toBe('Uint');
    expect(prove.arguments[1]!.type.length).toBe(32);
  });

  it('caps the threshold at the range the API validates', () => {
    const prove = info.circuits.find((c) => c.name === 'proveThreshold')!;
    // The zod schema allows 0..1000; the circuit's Uint<16> must contain it.
    expect(prove.arguments[0]!.type.maxval).toBeGreaterThanOrEqual(1000);
  });

  it('names the circuit consistently with the TypeScript CIRCUIT_ID tag', () => {
    const source = readFileSync(path.resolve(__dirname, '../../circuits/datacenter-score.compact'), 'utf8');
    expect(source).toContain(CIRCUIT_ID);
  });
});

describe.skipIf(!compiled)('compiled circuit: commitment security properties', () => {
  const digest = bytes32('digest-a');
  const blinding = bytes32('blind-1');
  const pack = bytes32('rules-v1');
  const open = (d = digest, b = blinding, p = pack) => hex(pureCircuits.openCommitment(d, b, p));

  it('is deterministic — a verifier can re-derive it', () => {
    expect(open()).toBe(open());
  });

  it('hides the digest behind the blinding factor', () => {
    // Without this, anyone holding a guessed design could confirm it by
    // recomputing the commitment.
    expect(open()).not.toBe(open(digest, bytes32('blind-2')));
  });

  it('binds the commitment to the rule pack', () => {
    // Without this, a proof made under a lax pack replays as a strict one.
    expect(open()).not.toBe(open(digest, blinding, bytes32('rules-v2')));
  });

  it('changes when the design changes', () => {
    expect(open()).not.toBe(open(bytes32('digest-b')));
  });

  it('returns a 32-byte commitment', () => {
    expect(pureCircuits.openCommitment(digest, blinding, pack)).toHaveLength(32);
  });

  it('does not collide across a spread of inputs', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 64; i++) seen.add(open(bytes32(`digest-${i}`), bytes32(`blind-${i}`)));
    expect(seen.size).toBe(64);
  });
});
