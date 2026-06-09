import { afterEach, describe, expect, it } from 'vitest';
import { getSBTContractAddress } from '@/lib/sbt/client';

const ENV_KEYS = [
  'NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_POLYGON_AMOY',
  'NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_SEPOLIA',
  'NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_ETHEREUM',
  'NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_MAINNET',
];

describe('SBT contract address resolution', () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  it('prefers the Ethereum mainnet alias before the generic mainnet fallback', () => {
    process.env.NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_ETHEREUM = '0x1111111111111111111111111111111111111111';
    process.env.NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_MAINNET = '0x2222222222222222222222222222222222222222';

    expect(getSBTContractAddress(1)).toBe('0x1111111111111111111111111111111111111111');
  });

  it('resolves Polygon Amoy from the dedicated override', () => {
    process.env.NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_POLYGON_AMOY = '0x3333333333333333333333333333333333333333';

    expect(getSBTContractAddress(80002)).toBe('0x3333333333333333333333333333333333333333');
  });
});
