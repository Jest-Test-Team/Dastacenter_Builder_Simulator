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
 * `mintCertificate` circuit (circuits/build) are all real. The on-chain mint
 * itself runs through the headless CLI (`scripts/midnight-cli.mjs`, wrapped by
 * `./scripts/midnight-setup.sh deploy|mint`): the current proof server
 * (7.0.0-rc.1) exposes the `/check` + `/prove` endpoints midnight-js 4.1.1
 * needs — the old "no released combination" block (docs/MIDNIGHT_ZK.md, tested
 * against server 4.0.0) no longer holds — and the CLI deploys the contract and
 * calls `mintCertificate` with a funded Preview wallet seed.
 *
 * The browser path deliberately does NOT bundle the heavy midnight-js SDK (it
 * would jeopardise the Cloudflare Worker build), so from the browser this
 * connects the wallet, shows the unshielded-NIGHT balance and derives the
 * witness, then hands off to the CLI for the on-chain submission. It never
 * fabricates a transaction.
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

/** Precise, honest description of how the on-chain mint is driven. */
const CLI_HANDOFF =
  'On-chain Midnight mint runs through the CLI (the browser deliberately does not ' +
  'bundle the heavy midnight-js SDK). Start a proof server (./scripts/midnight-setup.sh ' +
  'serve), deploy the contract (./scripts/midnight-setup.sh deploy) and mint ' +
  '(./scripts/midnight-setup.sh mint) with a funded Preview wallet seed — see ' +
  'docs/MIDNIGHT_ZK.md. Your wallet, unshielded-NIGHT balance, the local witness and ' +
  'the compiled mintCertificate circuit are all ready. No transaction is fabricated here.';

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

  // 3. On-chain submission runs through the CLI (see the module comment). The
  //    browser hands off rather than bundling the SDK or faking a transaction.
  void config;
  report?.({ stage: 'unavailable', reason: CLI_HANDOFF });
  throw new MidnightUnavailableError(CLI_HANDOFF);
}

/** Thrown when the Midnight mint cannot proceed — carries the precise reason. */
export class MidnightUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MidnightUnavailableError';
  }
}
