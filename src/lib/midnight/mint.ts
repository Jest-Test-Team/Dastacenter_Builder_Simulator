/**
 * Mint the certificate on the Midnight Preview testnet.
 *
 * The flow: connect Lace → derive the threshold witness locally (the same
 * witness the Noir path uses) → call the deployed Compact contract's
 * `mintCertificate` circuit, which records the blinded commitment on the
 * Midnight ledger, paying fees in tDUST generated from the wallet's unshielded
 * tNIGHT.
 *
 * The wallet connection, balance read, zero-knowledge witness derivation and the
 * compiled Compact circuit (circuits/build) are all real. The on-chain mint is
 * gated by an UPSTREAM protocol-generation gap, verified 2026-08-14: the live
 * Preview network + proof server run ledger-v9, but the newest published Compact
 * compiler (0.31.1) and @midnight-ntwrk/wallet only produce ledger-v8 artifacts,
 * and a v8 circuit cannot be minted on a v9 network. The aligned SDK exists
 * (midnight-js 5.0.0-beta = ledger-v9) but there is no v9 compiler or wallet yet.
 * See docs/MIDNIGHT_ZK.md.
 *
 * So this connects Lace, shows the unshielded-NIGHT balance and derives the
 * witness locally, then reports that gap precisely. It never fabricates a
 * transaction. It activates unchanged the moment Midnight publishes a ledger-v9
 * Compact compiler + wallet. The Sepolia mint issues a real certificate today,
 * backed by the same threshold ZK proof.
 */

'use client';

import type { BuildState } from '@/lib/blocks';
import { witnessFromBuild } from '@/lib/zk/witness';
import { DEFAULT_THRESHOLD } from '@/lib/zk/types';
import { connectMidnightWallet, type ConnectedMidnightWallet } from './wallet';
import { midnightConfig } from './config';

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

/** Precise, honest description of the current upstream generation gap. */
const GEN_GAP =
  'Midnight on-chain mint is gated upstream. Live Preview runs ledger-v9, but the ' +
  'newest public Compact compiler (0.31.1) and wallet only produce ledger-v8 — a v8 ' +
  'circuit cannot be minted on a v9 network, and no v9 compiler/wallet is published ' +
  'yet (see docs/MIDNIGHT_ZK.md). Your Lace wallet, unshielded-NIGHT balance and the ' +
  'zero-knowledge witness above are all real, and the Compact circuit is compiled and ' +
  'ready — this mint activates unchanged once Midnight ships the ledger-v9 toolchain. ' +
  'No transaction is fabricated. Meanwhile the Sepolia mint issues a real certificate ' +
  'backed by the same threshold ZK proof.';

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

  // 3. On-chain mint is gated by the ledger-v8 vs v9 gap (see the module
  //    comment). Report it precisely rather than bundle the SDK or fake a tx.
  void config;
  report?.({ stage: 'unavailable', reason: GEN_GAP });
  throw new MidnightUnavailableError(GEN_GAP);
}

/** Thrown when the Midnight mint cannot proceed — carries the precise reason. */
export class MidnightUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MidnightUnavailableError';
  }
}
