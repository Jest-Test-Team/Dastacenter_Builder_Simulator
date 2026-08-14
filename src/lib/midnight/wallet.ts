/**
 * Midnight wallet (Lace) connection via the DApp Connector API.
 *
 * Midnight wallets inject a CIP-30-style connector at `window.midnight`, keyed
 * by wallet name (Lace is `mnLace`). This module connects, reads the address
 * and the **unshielded NIGHT balance** (the figure shown in the wallet's
 * "UNSHIELDED BALANCE" panel), and hands back the enabled wallet API for the
 * mint flow to build and submit a transaction.
 *
 * This is the part that works today with a real Lace install — it needs no
 * proof server. The typings are a minimal local mirror of
 * `@midnight-ntwrk/dapp-connector-api` so the app has no hard dependency on the
 * SDK just to read a balance.
 */

'use client';

export interface DAppConnectorWalletState {
  address: string;
  coinPublicKey: string;
  encryptionPublicKey?: string;
  /** token-type (hex) -> amount, in the token's smallest unit. */
  balances: Record<string, bigint | string | number>;
}

export interface DAppConnectorWalletAPI {
  state(): Promise<DAppConnectorWalletState>;
  // Present on the full API; typed loosely because the mint flow loads the SDK
  // lazily and this module only needs state() to read the balance.
  balanceAndProveTransaction?: (tx: unknown, newCoins?: unknown) => Promise<unknown>;
  submitTransaction?: (tx: unknown) => Promise<string>;
}

export interface DAppConnectorAPI {
  apiVersion: string;
  name: string;
  icon?: string;
  enable(): Promise<DAppConnectorWalletAPI>;
  isEnabled(): Promise<boolean>;
  /** URIs the dApp should point its providers at (indexer, node, proof server). */
  serviceUriConfig?: () => Promise<{
    indexerUri?: string;
    indexerWsUri?: string;
    nodeUri?: string;
    proverServerUri?: string;
  }>;
}

type MidnightWindow = Window & {
  midnight?: Record<string, DAppConnectorAPI>;
};

/** The Lace-for-Midnight connector key. */
const LACE_KEY = 'mnLace';

export function getMidnightConnector(preferred = LACE_KEY): DAppConnectorAPI | null {
  if (typeof window === 'undefined') return null;
  const injected = (window as MidnightWindow).midnight;
  if (!injected) return null;
  return injected[preferred] ?? Object.values(injected)[0] ?? null;
}

export function isMidnightWalletAvailable(): boolean {
  return getMidnightConnector() !== null;
}

export interface ConnectedMidnightWallet {
  api: DAppConnectorWalletAPI;
  address: string;
  coinPublicKey: string;
  /** Total unshielded NIGHT, as a decimal string for display. */
  unshieldedNight: string;
}

/** NIGHT has 6 decimal places, like the wallet UI ("5000.0"). */
const NIGHT_DECIMALS = 6;

function toDecimal(total: bigint, decimals = NIGHT_DECIMALS): string {
  const base = 10n ** BigInt(decimals);
  const whole = total / base;
  const frac = total % base;
  if (frac === 0n) return `${whole}.0`;
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fracStr}`;
}

/** Sums the wallet's reported balances — the unshielded NIGHT the wallet holds. */
export function sumUnshieldedNight(balances: DAppConnectorWalletState['balances']): string {
  let total = 0n;
  for (const value of Object.values(balances ?? {})) {
    try {
      total += BigInt(typeof value === 'number' ? Math.floor(value) : value);
    } catch {
      /* skip non-numeric balance entries */
    }
  }
  return toDecimal(total);
}

/**
 * Connects Lace and reads the wallet state. Throws a user-facing message when
 * the wallet is not installed or the user rejects — both are meaningful,
 * actionable outcomes, not errors to swallow.
 */
export async function connectMidnightWallet(): Promise<ConnectedMidnightWallet> {
  const connector = getMidnightConnector();
  if (!connector)
    throw new Error(
      'Midnight wallet not found. Install Lace (Midnight) and switch it to the Preview network.',
    );

  const api = await connector.enable();
  const state = await api.state();
  return {
    api,
    address: state.address,
    coinPublicKey: state.coinPublicKey,
    unshieldedNight: sumUnshieldedNight(state.balances),
  };
}
