/**
 * Pure Midnight helpers: unshielded-NIGHT balance formatting and mint-config
 * gating. The wallet connection and on-chain call need a browser + Lace + a
 * proof server, so only the deterministic pieces are unit-tested here.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  sumUnshieldedNight,
  listMidnightWallets,
  getMidnightConnector,
  isMidnightWalletAvailable,
} from '@/lib/midnight/wallet';
import { isMidnightMintConfigured, midnightConfig } from '@/lib/midnight/config';

/** Minimal fake connector matching the v4 DApp Connector API shape we read. */
function fakeConnector(name: string, rdns = '') {
  return {
    apiVersion: '4.0.0',
    name,
    rdns,
    connect: async () => ({
      getUnshieldedAddress: async () => ({ unshieldedAddress: '' }),
      getUnshieldedBalances: async () => ({}),
    }),
  };
}

function setInjected(map: Record<string, ReturnType<typeof fakeConnector>> | undefined) {
  (globalThis as unknown as { window?: unknown }).window = map ? { midnight: map } : {};
}

describe('listMidnightWallets', () => {
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('detects Lace and 1AM by injection key and orders known wallets first', () => {
    setInjected({ '1am': fakeConnector('1AM'), mnLace: fakeConnector('Lace') });
    const wallets = listMidnightWallets();
    expect(wallets.map((w) => w.id)).toEqual(['lace', '1am']);
    expect(wallets.find((w) => w.id === '1am')?.accent).toBe('1am');
  });

  it('matches by rdns even when the name/key are unfamiliar', () => {
    setInjected({ 'uuid-1': fakeConnector('some-brand', 'com.midnight.1am') });
    const [wallet] = listMidnightWallets();
    expect(wallet?.id).toBe('1am');
  });

  it('detects a wallet whose connect() lives on the prototype (Lace-style)', () => {
    const proto = { connect: async () => ({}) };
    const lace = Object.assign(Object.create(proto), {
      name: 'lace',
      rdns: 'io.lace.wallet',
      apiVersion: '4.0.1',
    });
    (globalThis as unknown as { window?: unknown }).window = { midnight: { 'uuid-lace': lace } };
    const [wallet] = listMidnightWallets();
    expect(wallet?.id).toBe('lace');
    expect(wallet?.accent).toBe('lace');
  });

  it('identifies a wallet by connector.name even under an unknown key', () => {
    setInjected({ 'uuid-xyz': fakeConnector('1AM Wallet') });
    const wallets = listMidnightWallets();
    expect(wallets).toHaveLength(1);
    expect(wallets[0]?.id).toBe('1am');
    expect(wallets[0]?.key).toBe('uuid-xyz');
  });

  it('falls back to a generic entry for an unrecognised wallet', () => {
    setInjected({ someWallet: fakeConnector('Some Other Wallet') });
    const [wallet] = listMidnightWallets();
    expect(wallet?.accent).toBe('generic');
    expect(wallet?.label).toBe('Some Other Wallet');
  });

  it('reports no wallet when window.midnight is absent', () => {
    setInjected(undefined);
    expect(listMidnightWallets()).toEqual([]);
    expect(isMidnightWalletAvailable()).toBe(false);
  });

  it('getMidnightConnector honours the preferred id, else returns the first', () => {
    setInjected({ mnLace: fakeConnector('Lace'), '1am': fakeConnector('1AM') });
    expect(getMidnightConnector('1am')?.id).toBe('1am');
    expect(getMidnightConnector()?.id).toBe('lace');
  });
});

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
