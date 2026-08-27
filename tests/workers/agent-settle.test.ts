/**
 * Runs inside real workerd, not Node.
 *
 * Covers the agent's **pure** modules — the rate card and credential
 * verification — in the runtime they deploy to. Those are where the logic lives,
 * so they are the ones worth pinning here.
 *
 * `src/lib/agent/settle.ts` is deliberately NOT imported, and the reason is
 * worth writing down because it looks like an omission:
 *
 *   The workerd bundled with `@cloudflare/vitest-pool-workers` is older than the
 *   deploy target — it caps out at compatibility date 2024-12-18 and falls back
 *   from the 2026-06-07 in `wrangler.jsonc` (the runner prints this warning on
 *   every run). Under that older runtime `node:https` is absent, and ethers'
 *   `utils/geturl.js` imports it, so merely importing the agent throws
 *   `No such module "node:https"`.
 *
 *   That is a limitation of the local runner, not of production: `src/lib/sbt/
 *   server.ts` imports ethers identically and `/api/sbt/mint` serves live
 *   traffic on the deployed Worker today, which could not happen if the import
 *   failed there. Pinning a false failure here would train people to ignore this
 *   suite, which is the opposite of what it is for.
 *
 * The generator's own invariants are tested in `tests/unit/agent-settle.test.ts`,
 * which needs no chain and no Workers runtime.
 */

import { describe, expect, it } from 'vitest';
import { verifyCredential } from '@/lib/agent/credential';
import { entitlementOf, levelOf, rateFor } from '@/lib/agent/rate-card';
import { CIRCUIT_ID } from '@/lib/zk';

describe('rate card in workerd', () => {
  it('pays the narrative figure for the Elite credential', () => {
    expect(rateFor('Platinum')).toBe(1500);
    expect(entitlementOf(['Platinum', 'Gold'])).toBe(2700);
  });

  it('pays an unrecognised level the floor, never more', () => {
    expect(rateFor('Unobtainium')).toBe(500);
    expect(rateFor('Unobtainium')).toBeLessThan(rateFor('Diamond'));
  });

  it('reads the level from either attribute spelling', () => {
    expect(levelOf([{ trait_type: 'Certification Level', value: 'Gold' }])).toBe('Gold');
    expect(levelOf(undefined)).toBe('Bronze');
  });
});

describe('credential verification in workerd', () => {
  const holder = '0x1111111111111111111111111111111111111111';
  const hash = `0x${'ab'.repeat(32)}`;

  it('accepts a real, privacy-preserving credential', () => {
    const verdict = verifyCredential(
      {
        tokenId: '1',
        owner: holder,
        onChainBlueprintHash: hash,
        metadataUri: 'ipfs://x',
        metadata: {
          attributes: [
            { trait_type: 'Level', value: 'Platinum' },
            { trait_type: 'Score', value: '>= 85' },
            { trait_type: 'Blueprint Hash', value: hash },
            { trait_type: 'Proof Circuit', value: CIRCUIT_ID },
            { trait_type: 'Rule Pack', value: 'v1.0.0' },
            { trait_type: 'Proof Backend', value: 'noir' },
          ],
        },
      },
      holder,
    );
    expect(verdict.ok).toBe(true);
    expect(verdict.level).toBe('Platinum');
  });

  it('refuses an empty credential rather than defaulting to payable', () => {
    const verdict = verifyCredential(
      {
        tokenId: '1',
        owner: holder,
        onChainBlueprintHash: hash,
        metadataUri: 'ipfs://x',
        metadata: { attributes: [] },
      },
      holder,
    );
    expect(verdict.ok).toBe(false);
  });
});
