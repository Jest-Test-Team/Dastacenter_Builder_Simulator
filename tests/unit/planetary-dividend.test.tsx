/**
 * The dividend panel shows a number denominated in a token next to a wallet the
 * user owns. That is exactly the shape of a thing a viewer will read as "money
 * I have been paid", so the disclaimer is load-bearing, not decoration — it is
 * asserted here so it cannot be quietly dropped in a later tidy-up.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Address } from 'viem';
import { PlanetaryDividend } from '@/components/cert/PlanetaryDividend';
import type { CertificateInfo } from '@/lib/sbt/client';

type OwnedCert = CertificateInfo & { chainId: number };

function cert(tokenId: bigint, level: string): OwnedCert {
  return {
    tokenId,
    blueprintHash: `0x${'11'.repeat(32)}`,
    metadataURI: 'ipfs://x',
    owner: `0x${'22'.repeat(20)}` as Address,
    chainId: 11155111,
    metadata: {
      attributes: [{ trait_type: 'Level', value: level }],
    } as OwnedCert['metadata'],
  };
}

describe('PlanetaryDividend', () => {
  it('renders nothing without a certificate', () => {
    const { container } = render(<PlanetaryDividend certs={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('states plainly that nothing has been paid', () => {
    render(<PlanetaryDividend certs={[cert(1n, 'Gold')]} />);
    expect(screen.getByText(/no dividend has been paid/i)).toBeTruthy();
    expect(screen.getByText(/projection/i)).toBeTruthy();
  });

  it('totals the rate card across held certificates', () => {
    render(<PlanetaryDividend certs={[cert(1n, 'Gold'), cert(2n, 'Silver')]} />);
    // Gold 12 + Silver 8.
    expect(screen.getByText(/20 KSN/)).toBeTruthy();
  });

  it('falls back to the lowest rate for an unknown level', () => {
    render(<PlanetaryDividend certs={[cert(9n, 'Wood')]} />);
    expect(screen.getByText(/5 KSN/)).toBeTruthy();
  });
});
