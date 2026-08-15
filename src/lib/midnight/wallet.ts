/**
 * Midnight wallet connection via the DApp Connector API.
 *
 * Midnight wallets inject a CIP-30-style connector into `window.midnight`. Per
 * the Midnight docs you must *enumerate* the injected connectors rather than
 * reach for a fixed key — Lace injects under `mnLace`, 1AM under `1am`, and
 * newer wallets may key by a fresh id. This module enumerates them, tags each
 * with friendly metadata (label / accent / install URL), connects the one the
 * user picks, and reads the **unshielded NIGHT balance** (the figure shown in
 * the wallet's "UNSHIELDED BALANCE" panel) for the mint flow.
 *
 * This part works today with a real wallet install — it needs no proof server.
 * The typings are a minimal local mirror of `@midnight-ntwrk/dapp-connector-api`
 * so the app has no hard dependency on the SDK just to read a balance.
 */

'use client';

import { midnightConfig } from './config';

/** balances are token-type -> amount in the token's smallest unit. */
export type MidnightBalances = Record<string, bigint | string | number>;

/**
 * The wallet API returned by `connect()` in DApp Connector API **v4** (the
 * version Lace 4.0.1 and 1AM 4.0.0 ship). Addresses and balances are separate
 * shielded/unshielded calls; the mint flow only needs the unshielded ones plus
 * the transaction methods, so the rest are typed loosely and optional.
 */
export interface ConnectedAPI {
  getUnshieldedAddress(): Promise<{ unshieldedAddress: string }>;
  getUnshieldedBalances(): Promise<MidnightBalances>;
  getShieldedAddresses?(): Promise<{
    shieldedAddress: string;
    shieldedCoinPublicKey: string;
    shieldedEncryptionPublicKey: string;
  }>;
  getShieldedBalances?(): Promise<MidnightBalances>;
  makeTransfer?(desiredOutputs: unknown[]): Promise<{ tx: string }>;
  balanceUnsealedTransaction?(tx: string): Promise<{ tx: string }>;
  submitTransaction?(tx: string): Promise<void>;
  getConfiguration?(): Promise<{
    indexerUri: string;
    indexerWsUri: string;
    proverServerUri?: string;
    substrateNodeUri: string;
    networkId: string;
  }>;
}

/**
 * The passive connector each wallet injects into `window.midnight` (EIP-6963
 * style): stable `rdns` id, display metadata, and `connect(networkId)` which
 * prompts the user and resolves to the {@link ConnectedAPI}. Note: no `enable()`
 * — that was the pre-v4 spec this app originally (wrongly) targeted.
 */
export interface InitialAPI {
  rdns: string;
  name: string;
  icon?: string;
  apiVersion: string;
  connect(networkId: string): Promise<ConnectedAPI>;
}

type MidnightWindow = Window & {
  midnight?: Record<string, InitialAPI>;
};

/** Friendly, app-facing metadata for a Midnight wallet brand. */
export interface MidnightWalletMeta {
  /** Stable id we use in the UI/mint flow (not necessarily the injection key). */
  id: string;
  label: string;
  /** Stable reverse-DNS ids the wallet reports (v4) — the most reliable match. */
  rdns: string[];
  /** Known injection keys; used as a hint alongside rdns / name matching. */
  keys: string[];
  /** Matches the connector's self-reported `name`, so key drift doesn't matter. */
  match: (name: string) => boolean;
  /** Drives the badge colour: Lace = indigo, 1AM = amber. */
  accent: 'lace' | '1am' | 'generic';
  installUrl: string;
  tagline: string;
}

/** Wallets we render first-class UI for. Any other injected wallet still works. */
export const KNOWN_MIDNIGHT_WALLETS: MidnightWalletMeta[] = [
  {
    id: 'lace',
    label: 'Lace',
    rdns: ['io.lace.wallet'],
    keys: ['mnLace'],
    match: (name) => /lace/i.test(name),
    accent: 'lace',
    installUrl: 'https://www.lace.io/midnight',
    tagline: 'IOG · desktop extension',
  },
  {
    id: '1am',
    label: '1AM',
    rdns: ['com.midnight.1am'],
    keys: ['1am', 'mn1am', 'oneAm'],
    match: (name) => /\b1\s*am\b/i.test(name),
    accent: '1am',
    installUrl: 'https://1am.xyz/',
    tagline: 'DUST-sponsored · Preview',
  },
];

const GENERIC_META = (id: string, label: string): MidnightWalletMeta => ({
  id,
  label,
  rdns: [],
  keys: [id],
  match: () => false,
  accent: 'generic',
  installUrl: 'https://docs.midnight.network/',
  tagline: 'Midnight DApp connector',
});

/** A wallet actually present in `window.midnight`, resolved to friendly metadata. */
export interface DetectedMidnightWallet extends MidnightWalletMeta {
  /** The live injection key on `window.midnight`. */
  key: string;
  connector: InitialAPI;
}

function metaFor(key: string, connector: InitialAPI): MidnightWalletMeta {
  const name = connector.name ?? '';
  const rdns = connector.rdns ?? '';
  const known = KNOWN_MIDNIGHT_WALLETS.find(
    (w) => w.rdns.includes(rdns) || w.keys.includes(key) || w.match(name),
  );
  return known ?? GENERIC_META(key, name || key);
}

/**
 * Enumerates every injected Midnight connector, newest wallets included, tagged
 * with friendly metadata. De-dupes by resolved wallet id so a wallet injected
 * under two keys shows once. Empty when no Midnight wallet is installed.
 */
export function listMidnightWallets(): DetectedMidnightWallet[] {
  if (typeof window === 'undefined') return [];
  const injected = (window as MidnightWindow).midnight;
  if (!injected) return [];

  const detected: DetectedMidnightWallet[] = [];
  const seen = new Set<string>();
  for (const [key, connector] of Object.entries(injected)) {
    // v4 connectors expose connect() (own or on the prototype, as Lace does).
    if (!connector || typeof connector.connect !== 'function') continue;
    const meta = metaFor(key, connector);
    if (seen.has(meta.id)) continue;
    seen.add(meta.id);
    detected.push({ ...meta, key, connector });
  }
  // Stable order: known wallets in declared order, then anything else.
  detected.sort((a, b) => {
    const ai = KNOWN_MIDNIGHT_WALLETS.findIndex((w) => w.id === a.id);
    const bi = KNOWN_MIDNIGHT_WALLETS.findIndex((w) => w.id === b.id);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  return detected;
}

/** Resolve a single connector, preferring a given wallet id, else the first. */
export function getMidnightConnector(preferredId?: string): DetectedMidnightWallet | null {
  const wallets = listMidnightWallets();
  if (wallets.length === 0) return null;
  if (preferredId) {
    const match = wallets.find((w) => w.id === preferredId || w.key === preferredId);
    if (match) return match;
  }
  return wallets[0] ?? null;
}

export function isMidnightWalletAvailable(): boolean {
  return listMidnightWallets().length > 0;
}

/**
 * A snapshot of what the browser has actually injected — surfaced in the UI when
 * detection fails so a "installed but not detected" case becomes diagnosable
 * without opening DevTools. `suspects` catches a wallet that injected under an
 * unexpected global (e.g. a Cardano-style `window.cardano` entry) so we can see
 * exactly where 1AM landed.
 */
export interface MidnightInjectionReport {
  hasMidnightGlobal: boolean;
  /** Keys on `window.midnight`. */
  midnightKeys: string[];
  /** Each injected connector's self-reported name + apiVersion. */
  connectors: Array<{ key: string; name: string; rdns: string; apiVersion: string; hasConnect: boolean }>;
  /** Other top-level window globals whose name hints at a Midnight wallet. */
  suspects: string[];
}

export function midnightInjectionReport(): MidnightInjectionReport {
  const empty: MidnightInjectionReport = {
    hasMidnightGlobal: false,
    midnightKeys: [],
    connectors: [],
    suspects: [],
  };
  if (typeof window === 'undefined') return empty;

  const mid = (window as MidnightWindow).midnight;
  const connectors = mid
    ? Object.entries(mid).map(([key, c]) => ({
        key,
        name: c?.name ?? '(no name)',
        rdns: c?.rdns ?? '?',
        apiVersion: c?.apiVersion ?? '?',
        hasConnect: typeof c?.connect === 'function',
      }))
    : [];

  const suspects: string[] = [];
  try {
    for (const key of Object.keys(window as unknown as Record<string, unknown>)) {
      if (key !== 'midnight' && /midnight|1am|lace/i.test(key)) suspects.push(key);
    }
    // 1AM is a Cardano partner-chain wallet; it may also expose a CIP-30 entry.
    const cardano = (window as unknown as { cardano?: Record<string, unknown> }).cardano;
    if (cardano) {
      for (const key of Object.keys(cardano)) {
        if (/1am|midnight/i.test(key)) suspects.push(`cardano.${key}`);
      }
    }
  } catch {
    /* enumerating window can throw on locked-down globals; ignore */
  }

  return {
    hasMidnightGlobal: Boolean(mid),
    midnightKeys: mid ? Object.keys(mid) : [],
    connectors,
    suspects,
  };
}

export interface ConnectedMidnightWallet {
  api: ConnectedAPI;
  /** The wallet brand connected (lace / 1am / generic). */
  walletId: string;
  walletLabel: string;
  /** The unshielded (Bech32m) address — matches the wallet's NIGHT balance. */
  address: string;
  /** Shielded coin public key, when the wallet exposes it. */
  coinPublicKey: string;
  /** Total unshielded NIGHT, as a decimal string for display. */
  unshieldedNight: string;
}

/** NIGHT has 6 decimal places, like the wallet UI ("1000.0"). */
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
export function sumUnshieldedNight(balances: MidnightBalances): string {
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
 * Connects a Midnight wallet and reads its state via the v4 connector API. Pass
 * a wallet id (`lace`, `1am`, …) to target a specific brand; omit to use the
 * first detected. `connect()` prompts the user — a rejection throws, which is a
 * meaningful, actionable outcome, not an error to swallow.
 *
 * `networkId` is the network the dApp asks the wallet for (default Preview,
 * env-tunable via NEXT_PUBLIC_MIDNIGHT_NETWORK) — the wallet itself must also be
 * set to that network.
 */
export async function connectMidnightWallet(
  preferredId?: string,
  networkId: string = midnightConfig().network,
): Promise<ConnectedMidnightWallet> {
  const wallet = getMidnightConnector(preferredId);
  if (!wallet)
    throw new Error(
      'No Midnight wallet found. Install Lace (Midnight) or 1AM and switch it to the Preview network.',
    );

  const api = await wallet.connector.connect(networkId);

  // Address + balance are separate calls in v4. The unshielded pair is what the
  // mint uses (NIGHT → DUST fees); the shielded key is best-effort for display.
  const [{ unshieldedAddress }, balances, shielded] = await Promise.all([
    api.getUnshieldedAddress(),
    api.getUnshieldedBalances(),
    api.getShieldedAddresses?.().catch(() => undefined) ?? Promise.resolve(undefined),
  ]);

  return {
    api,
    walletId: wallet.id,
    walletLabel: wallet.label,
    address: unshieldedAddress,
    coinPublicKey: shielded?.shieldedCoinPublicKey ?? '',
    unshieldedNight: sumUnshieldedNight(balances),
  };
}
