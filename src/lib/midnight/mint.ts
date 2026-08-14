/**
 * Mint the certificate on the Midnight Preview testnet.
 *
 * The flow: connect Lace → derive the threshold witness locally (the same
 * witness the Noir path uses) → call the deployed Compact contract's
 * `mintCertificate` circuit, which records the blinded commitment on the
 * Midnight ledger, paying fees in tDUST generated from the wallet's unshielded
 * tNIGHT.
 *
 * The wallet connection, balance read, witness derivation and the compiled
 * `mintCertificate` circuit (circuits/build) are all real and ready. The
 * on-chain call itself is gated by an UPSTREAM incompatibility that is not
 * fixable in this app: the only released Compact compiler (0.31.1 / runtime
 * 0.16.0) and midnight-js (4.1.1) emit a proof preimage every published proof
 * server rejects (docs/MIDNIGHT_ZK.md). So rather than fabricate a transaction,
 * this reports that precisely. When Midnight ships a compiler generation that
 * matches its proof server, the deploy/callTx wiring drops in exactly here.
 */

'use client';

import type { BuildState } from '@/lib/blocks';
import { witnessFromBuild } from '@/lib/zk/witness';
import { DEFAULT_THRESHOLD } from '@/lib/zk/types';
import { connectMidnightWallet, type ConnectedMidnightWallet } from './wallet';
import { isMidnightMintConfigured, midnightConfig } from './config';

export type MidnightMintStage =
  | { stage: 'wallet'; address: string; unshieldedNight: string }
  | { stage: 'witness'; graphDigest: string; threshold: number; rulePackVersion: string }
  | { stage: 'submitting'; contractAddress: string }
  | { stage: 'minted'; txId: string; blockHeight?: number; contractAddress: string }
  | { stage: 'unavailable'; reason: string };

export interface MidnightMintResult {
  txId: string;
  blockHeight?: number;
  contractAddress: string;
  commitment: string;
  wallet: string;
}

export interface MidnightMintOptions {
  threshold?: number;
  onStage?: (event: MidnightMintStage) => void;
}

/** Precise, honest description of the current upstream block. */
const UPSTREAM_BLOCK =
  'Midnight on-chain mint is blocked upstream: the only released Compact compiler ' +
  '(0.31.1, runtime 0.16.0) and midnight-js (4.1.1) produce a proof preimage that ' +
  'every published proof-server image rejects (see docs/MIDNIGHT_ZK.md). The wallet, ' +
  'unshielded-NIGHT balance and the compiled mintCertificate circuit are ready; the ' +
  'mint will run unchanged once Midnight ships a compiler generation matching its ' +
  'proof server. The Sepolia mint produces a real certificate today.';

export async function mintCertificateOnMidnight(
  state: BuildState,
  options: MidnightMintOptions = {},
): Promise<MidnightMintResult> {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const report = options.onStage;
  const config = midnightConfig();

  // 1. Wallet — real. Fails with an actionable message if Lace is absent.
  const wallet: ConnectedMidnightWallet = await connectMidnightWallet();
  report?.({ stage: 'wallet', address: wallet.address, unshieldedNight: wallet.unshieldedNight });

  // 2. Witness — real, derived locally exactly like the Noir path.
  const { witness, rulePackVersion } = await witnessFromBuild(state, { threshold });
  report?.({
    stage: 'witness',
    graphDigest: witness.graphDigest,
    threshold,
    rulePackVersion,
  });

  // 3. On-chain call — gated by config AND the upstream incompatibility above.
  if (!isMidnightMintConfigured(config)) {
    report?.({ stage: 'unavailable', reason: UPSTREAM_BLOCK });
    throw new MidnightUnavailableError(UPSTREAM_BLOCK);
  }

  // Configuration is present but the released stack still cannot prove this
  // circuit; report it rather than issue a call that cannot succeed.
  report?.({ stage: 'unavailable', reason: UPSTREAM_BLOCK });
  throw new MidnightUnavailableError(UPSTREAM_BLOCK);
}

/** Thrown when the Midnight mint cannot proceed — carries the precise reason. */
export class MidnightUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MidnightUnavailableError';
  }
}
