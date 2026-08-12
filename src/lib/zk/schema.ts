/**
 * Wire schemas for proofs.
 *
 * Kept out of the route modules because a Next.js route file may only export
 * route fields — exporting a schema from one fails the production build.
 */

import { z } from 'zod';

export const ProofSchema = z.object({
  statement: z.object({
    commitment: z.string().min(1),
    rulePackVersion: z.string().min(1),
    threshold: z.number().int().min(0).max(1000),
    circuit: z.string().min(1),
  }),
  proof: z.string().min(1),
  // Public inputs travel with the proof so a verifier can check the statement
  // against what was actually proven. Optional: mock proofs carry none.
  publicInputs: z.array(z.string()).optional(),
  backend: z.enum(['noir', 'midnight', 'mock']),
  createdAt: z.number().int().nonnegative(),
});

export const VerifyRequestSchema = z.object({
  proof: ProofSchema,
  expect: z
    .object({
      threshold: z.number().int().min(0).max(1000).optional(),
      rulePackVersion: z.string().min(1).optional(),
    })
    .optional(),
});

export const ProveRequestSchema = z.object({
  witness: z.object({
    graphDigest: z.string().regex(/^0x[0-9a-f]{64}$/, 'graphDigest must be a 32-byte hex hash'),
    score: z.number().finite().nonnegative(),
    blindingFactor: z.string().min(1),
  }),
  threshold: z.number().int().min(0).max(1000).optional(),
  rulePackVersion: z.string().min(1),
});
