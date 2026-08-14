/**
 * Prover selection and the build-to-witness bridge.
 */

import { MidnightProver } from './midnight-prover';
import { MockProver } from './mock-prover';
import { NoirProver } from './noir-prover';
import { ProofError, type Prover } from './types';

export * from './types';
export { MockProver, commitmentOf } from './mock-prover';
export { MidnightProver } from './midnight-prover';
export { NoirProver } from './noir-prover';
// BrowserProver is intentionally not re-exported here: it is loaded via a
// dynamic import in the client, so it (and its circuit JSON) stay out of the
// server bundle. Import it from './browser-prover' directly where needed.
export { verifyProofStatement } from './noir-shared';
export { randomBlindingFactor, witnessFromBuild, type WitnessResult } from './witness';

export interface ProverEnv {
  MIDNIGHT_PROOF_SERVER_URL?: string;
  NODE_ENV?: string;
  /** Explicit opt-in to the mock prover outside development. */
  ZK_ALLOW_MOCK?: string;
  /** Set to 'false' to disable the Noir prover (it needs the Node runtime). */
  ZK_NOIR?: string;
}

/**
 * Picks a prover, preferring real cryptography.
 *
 * Order: an explicitly configured Midnight proof server, then Noir, then the
 * mock. Noir is the default because it actually works — the Compact toolchain
 * and every published Midnight proof-server image are a protocol generation
 * apart (docs/MIDNIGHT_ZK.md), so the Midnight path stays available for anyone
 * who has a working server but is not what the app relies on.
 *
 * The mock is refused in production unless explicitly allowed, because it is
 * not sound: anyone can forge a mock proof. Silently degrading to it on a
 * deployed instance would turn a privacy credential into a rubber stamp.
 */
export function getProver(env: ProverEnv = process.env as ProverEnv): Prover {
  const url = env.MIDNIGHT_PROOF_SERVER_URL?.trim();
  if (url) return new MidnightProver({ url });

  // Needs the Node runtime: bb.js ships WASM that the edge runtime cannot load.
  if (env.ZK_NOIR !== 'false' && typeof process !== 'undefined' && process.versions?.node)
    return new NoirProver();

  const isProduction = env.NODE_ENV === 'production';
  if (isProduction && env.ZK_ALLOW_MOCK !== 'true')
    throw new ProofError(
      503,
      'No Midnight proof server configured. Set MIDNIGHT_PROOF_SERVER_URL, or set ZK_ALLOW_MOCK=true to accept unsound mock proofs.',
    );

  return new MockProver();
}
