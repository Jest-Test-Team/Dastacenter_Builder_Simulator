/**
 * The dividend panel shows a number denominated in a token next to a wallet the
 * user owns. That is exactly the shape of a thing a viewer will read as "money
 * I have been paid", so what the panel says about settlement is load-bearing,
 * not decoration.
 *
 * This used to assert one fixed disclaimer, because nothing behind the panel was
 * real and the answer was always "nothing was paid". Now that the agent actually
 * transfers an ERC-20, one sentence is no longer enough: the panel has three
 * states and the requirement is that **each one is true**. So each is asserted,
 * along with the rule that binds them — a receipt is shown only when there is a
 * transaction hash to show.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Address } from 'viem';
import { PlanetaryDividend } from '@/components/cert/PlanetaryDividend';
import type { CertificateInfo } from '@/lib/sbt/client';
import type { AgentEvent } from '@/lib/agent/types';

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

const settled: Extract<AgentEvent, { stage: 'settled' }> = {
  stage: 'settled',
  txHash: `0x${'ff'.repeat(32)}`,
  explorerUrl: 'https://sepolia.etherscan.io/tx/0xff',
  to: `0x${'22'.repeat(20)}`,
  amount: 1500,
  elapsedMs: 4200,
  line: 'Transaction confirmed.',
};

const blocked: Extract<AgentEvent, { stage: 'blocked' }> = {
  stage: 'blocked',
  at: 'settle',
  reason: 'Agent treasury holds too few KSN to pay 1500',
  elapsedMs: 3100,
  line: 'HALTED',
};

describe('PlanetaryDividend', () => {
  it('renders nothing without a certificate', () => {
    const { container } = render(<PlanetaryDividend certs={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('totals the rate card across held certificates', () => {
    render(<PlanetaryDividend certs={[cert(1n, 'Gold'), cert(2n, 'Silver')]} />);
    // Gold 1200 + Silver 800.
    expect(screen.getByText(/2,000 KSN/)).toBeTruthy();
  });

  it('pays the narrative figure for the Elite (Platinum) credential', () => {
    render(<PlanetaryDividend certs={[cert(1n, 'Platinum')]} />);
    expect(screen.getByText(/1,500 KSN/)).toBeTruthy();
  });

  it('falls back to the floor rate for an unknown level', () => {
    render(<PlanetaryDividend certs={[cert(9n, 'Wood')]} />);
    expect(screen.getByText(/500 KSN/)).toBeTruthy();
  });

  describe('settlement status is true in every state', () => {
    it('before a run, says nothing has been paid and calls itself an entitlement', () => {
      render(<PlanetaryDividend certs={[cert(1n, 'Platinum')]} />);
      expect(screen.getByText(/no dividend has been paid yet/i)).toBeTruthy();
      expect(screen.getByText(/not a receipt/i)).toBeTruthy();
      expect(screen.getByText(/not settled/i)).toBeTruthy();
    });

    it('when blocked, names the actual reason rather than staying silent', () => {
      render(<PlanetaryDividend certs={[cert(1n, 'Platinum')]} blocked={blocked} />);
      expect(screen.getByText(/no dividend has been paid/i)).toBeTruthy();
      expect(screen.getByText(/too few KSN/i)).toBeTruthy();
    });

    it('when settled, shows the real transaction hash and links to the explorer', () => {
      render(<PlanetaryDividend certs={[cert(1n, 'Platinum')]} settled={settled} />);
      expect(screen.getByText(/transferred to this wallet/i)).toBeTruthy();
      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toBe(settled.explorerUrl);
      expect(link.textContent).toContain(settled.txHash.slice(0, 14));
    });

    it('never claims settlement without a transaction to point at', () => {
      // The only way to reach the settled copy is to pass a settled event, and
      // the type makes txHash mandatory. Absent one, the panel must say so.
      render(<PlanetaryDividend certs={[cert(1n, 'Platinum')]} blocked={blocked} />);
      expect(screen.queryByText(/transferred to this wallet/i)).toBeNull();
      expect(screen.queryByRole('link')).toBeNull();
    });
  });
});
