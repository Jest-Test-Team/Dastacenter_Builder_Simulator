/**
 * Pure Midnight helpers: unshielded-NIGHT balance formatting and mint-config
 * gating. The wallet connection and on-chain call need a browser + Lace + a
 * proof server, so only the deterministic pieces are unit-tested here.
 */

import { describe, expect, it } from 'vitest';
import { sumUnshieldedNight } from '@/lib/midnight/wallet';
import { isMidnightMintConfigured, midnightConfig } from '@/lib/midnight/config';

describe('sumUnshieldedNight', () => {
  it('formats a single NIGHT balance like the wallet UI (6 decimals)', () => {
    // 5000 NIGHT = 5000 * 10^6 base units.
    expect(sumUnshieldedNight({ night: 5_000_000_000n })).toBe('5000.0');
  });

  it('sums across token entries and trims trailing zeros', () => {
    expect(sumUnshieldedNight({ a: 1_500_000n, b: 2_000_000n })).toBe('3.5');
  });

  it('ignores non-numeric entries without throwing', () => {
    expect(sumUnshieldedNight({ a: 1_000_000n, junk: 'n/a' as unknown as bigint })).toBe('1.0');
  });

  it('handles an empty balance map', () => {
    expect(sumUnshieldedNight({})).toBe('0.0');
  });
});

describe('isMidnightMintConfigured', () => {
  it('is false without a proof server + contract address', () => {
    expect(isMidnightMintConfigured(midnightConfig({}))).toBe(false);
    expect(
      isMidnightMintConfigured(
        midnightConfig({ NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER_URL: 'http://localhost:6300' }),
      ),
    ).toBe(false);
  });

  it('is true once both are set', () => {
    expect(
      isMidnightMintConfigured(
        midnightConfig({
          NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER_URL: 'http://localhost:6300',
          NEXT_PUBLIC_MIDNIGHT_CERT_CONTRACT_ADDRESS: '0200abcd',
        }),
      ),
    ).toBe(true);
  });

  it('defaults the network to preview', () => {
    expect(midnightConfig({}).network).toBe('preview');
  });
});
