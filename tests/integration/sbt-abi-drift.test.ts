/**
 * ABI drift between the deployed contract and the app's hardcoded ABI.
 *
 * `src/lib/sbt/abi.ts` is a hand-maintained copy of the contract interface. The
 * contract itself is already deployed at 0x0e6dF52Ffc02095C8AdE30a7B2Fda67a9FFf88eB
 * on Polygon Amoy and Sepolia and cannot be changed. If someone edits the
 * Solidity source and redeploys — or edits the ABI copy — without the other
 * side matching, minting breaks in production with an opaque decode error, and
 * no unit test catches it because `tests/unit/sbt-server.test.ts` mocks ethers
 * entirely.
 *
 * This compares the app's ABI against the compiled artefact for every signature
 * the app actually calls. It replaces the manual `contracts/scripts/test-mint.js`
 * step for the part that can be checked without a funded key: interface
 * compatibility. Sending a real transaction to a live testnet still requires
 * funds and stays manual.
 *
 * Skips when the contract has not been compiled — run `npm run test:contracts`
 * (or `cd contracts && npx hardhat compile`) to produce the artefact.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SBT_CONTRACT_ABI } from '@/lib/sbt/abi';

const ARTIFACT = path.resolve(
  __dirname,
  '../../contracts/artifacts/src/DatacenterCertificateSBT.sol/DatacenterCertificateSBT.json',
);
const compiled = existsSync(ARTIFACT);

interface AbiParam {
  name: string;
  type: string;
  indexed?: boolean;
}
interface AbiEntry {
  type: string;
  name?: string;
  inputs?: AbiParam[];
  outputs?: AbiParam[];
  stateMutability?: string;
}

const onChain: AbiEntry[] = compiled
  ? (JSON.parse(readFileSync(ARTIFACT, 'utf8')).abi as AbiEntry[])
  : [];
const inApp = SBT_CONTRACT_ABI as unknown as AbiEntry[];

/** Canonical signature, e.g. `mintCertificate(address,bytes32,string)`. */
const signature = (entry: AbiEntry) =>
  `${entry.name}(${(entry.inputs ?? []).map((input) => input.type).join(',')})`;

const byKind = (abi: AbiEntry[], kind: string) => abi.filter((entry) => entry.type === kind);

describe.skipIf(!compiled)('SBT ABI drift', () => {
  it('every function the app declares exists on the compiled contract', () => {
    const deployed = new Set(byKind(onChain, 'function').map(signature));
    const missing = byKind(inApp, 'function')
      .map(signature)
      .filter((sig) => !deployed.has(sig));
    expect(missing, 'app calls functions the contract does not have').toEqual([]);
  });

  it('every event the app decodes exists with the same parameter types', () => {
    const deployed = new Map(byKind(onChain, 'event').map((entry) => [signature(entry), entry]));
    for (const event of byKind(inApp, 'event')) {
      const match = deployed.get(signature(event));
      expect(match, `event ${signature(event)} is not on the contract`).toBeDefined();
      expect((match!.inputs ?? []).map((input) => input.type)).toEqual(
        (event.inputs ?? []).map((input) => input.type),
      );
    }
  });

  it('agrees on which event parameters are indexed', () => {
    // Topic layout depends on this. Getting it wrong makes `parseLog` return
    // the wrong values rather than throwing — the worst kind of drift.
    const deployed = new Map(byKind(onChain, 'event').map((entry) => [signature(entry), entry]));
    for (const event of byKind(inApp, 'event')) {
      const match = deployed.get(signature(event))!;
      expect((match.inputs ?? []).map((input) => Boolean(input.indexed))).toEqual(
        (event.inputs ?? []).map((input) => Boolean(input.indexed)),
      );
    }
  });

  it('agrees on return types for the views the app reads', () => {
    const deployed = new Map(byKind(onChain, 'function').map((entry) => [signature(entry), entry]));
    for (const fn of byKind(inApp, 'function')) {
      const match = deployed.get(signature(fn));
      if (!match) continue;
      expect(
        (match.outputs ?? []).map((output) => output.type),
        `${signature(fn)} returns a different type than the app expects`,
      ).toEqual((fn.outputs ?? []).map((output) => output.type));
    }
  });

  it('covers the calls the mint server actually makes', () => {
    // Named explicitly so removing one from abi.ts cannot quietly pass this file.
    const declared = new Set(byKind(inApp, 'function').map((entry) => entry.name));
    for (const required of ['mintCertificate', 'hasCertificate', 'totalSupply', 'getCertificates'])
      expect(declared, `abi.ts no longer declares ${required}`).toContain(required);
    expect(byKind(inApp, 'event').map((entry) => entry.name)).toContain('CertificateMinted');
  });

  it('keeps mintCertificate non-payable, as the relayer assumes', () => {
    const deployed = byKind(onChain, 'function').find((entry) => entry.name === 'mintCertificate')!;
    expect(deployed.stateMutability).toBe('nonpayable');
  });
});
