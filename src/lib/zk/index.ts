/**
 * Prover selection and the build-to-witness bridge.
 */

import type { BuildState } from '@/lib/blocks';
import { buildKnowledgeGraph, graphDigest } from '@/lib/kg';
import { score } from '@/lib/scoring';
import { MidnightProver } from './midnight-prover';
import { MockProver } from './mock-prover';
import { DEFAULT_THRESHOLD, ProofError, type Prover, type Witness } from './types';

export * from './types';
export { MockProver, commitmentOf } from './mock-prover';
export { MidnightProver } from './midnight-prover';

export interface ProverEnv {
  MIDNIGHT_PROOF_SERVER_URL?: string;
  NODE_ENV?: string;
  /** Explicit opt-in to the mock prover outside development. */
  ZK_ALLOW_MOCK?: string;
}

/**
 * Returns the real prover when a proof server is configured, otherwise the mock.
 *
 * The mock is refused in production unless explicitly allowed, because it is
 * not sound: anyone can forge a mock proof. Silently degrading to it on a
 * deployed instance would turn a privacy credential into a rubber stamp.
 */
export function getProver(env: ProverEnv = process.env as ProverEnv): Prover {
  const url = env.MIDNIGHT_PROOF_SERVER_URL?.trim();
  if (url) return new MidnightProver({ url });

  const isProduction = env.NODE_ENV === 'production';
  if (isProduction && env.ZK_ALLOW_MOCK !== 'true')
    throw new ProofError(
      503,
      'No Midnight proof server configured. Set MIDNIGHT_PROOF_SERVER_URL, or set ZK_ALLOW_MOCK=true to accept unsound mock proofs.',
    );

  return new MockProver();
}

/** Cryptographically random blinding factor, hex-encoded. */
export function randomBlindingFactor(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export interface WitnessResult {
  witness: Witness;
  rulePackVersion: string;
  /** The score, returned for the caller's own UI. Never put in a statement. */
  competitionScore: number;
  threshold: number;
}

/**
 * Turns a build into a witness.
 *
 * Runs the full knowledge-graph pipeline first, because the digest must commit
 * to the *fused* graph — the same graph the app serves and the same one a
 * verifier would rebuild. Proving against an unfused graph would produce a
 * commitment nobody else can reproduce.
 */
export async function witnessFromBuild(
  state: BuildState,
  options: { threshold?: number; blindingFactor?: string } = {},
): Promise<WitnessResult> {
  const { graph } = buildKnowledgeGraph(state);
  const report = score(state);
  const digest = await graphDigest(graph);

  return {
    witness: {
      graphDigest: digest,
      competitionScore: report.competitionScore,
      blindingFactor: options.blindingFactor ?? randomBlindingFactor(),
    },
    rulePackVersion: report.rulePackVersion,
    competitionScore: report.competitionScore,
    threshold: options.threshold ?? DEFAULT_THRESHOLD,
  };
}
