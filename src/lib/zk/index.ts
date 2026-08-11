/**
 * Prover selection and the build-to-witness bridge.
 */

import { MidnightProver } from './midnight-prover';
import { MockProver } from './mock-prover';
import { ProofError, type Prover } from './types';

export * from './types';
export { MockProver, commitmentOf } from './mock-prover';
export { MidnightProver } from './midnight-prover';
export { randomBlindingFactor, witnessFromBuild, type WitnessResult } from './witness';

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
