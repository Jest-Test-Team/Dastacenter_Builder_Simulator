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

/** Friendly, app-facing metadata for a Midnight wallet brand. */
export interface MidnightWalletMeta {
  /** Stable id we use in the UI/mint flow (not necessarily the injection key). */
  id: string;
  label: string;
  /** Known injection keys; used as a hint alongside connector.name matching. */
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
    keys: ['mnLace'],
    match: (name) => /lace/i.test(name),
    accent: 'lace',
    installUrl: 'https://www.lace.io/midnight',
    tagline: 'IOG · desktop extension',
  },
  {
    id: '1am',
    label: '1AM',
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
  connector: DAppConnectorAPI;
}

function metaFor(key: string, connector: DAppConnectorAPI): MidnightWalletMeta {
  const name = connector.name ?? '';
  const known = KNOWN_MIDNIGHT_WALLETS.find(
    (w) => w.keys.includes(key) || w.match(name),
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
    if (!connector || typeof connector.enable !== 'function') continue;
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
  connectors: Array<{ key: string; name: string; apiVersion: string; hasEnable: boolean }>;
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
        apiVersion: c?.apiVersion ?? '?',
        hasEnable: typeof c?.enable === 'function',
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
  api: DAppConnectorWalletAPI;
  /** The wallet brand connected (lace / 1am / generic). */
  walletId: string;
  walletLabel: string;
  address: string;
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
 * Connects a Midnight wallet and reads its state. Pass a wallet id (`lace`,
 * `1am`, …) to target a specific brand; omit to use the first detected. Throws
 * a user-facing message when no wallet is installed or the user rejects — both
 * are meaningful, actionable outcomes, not errors to swallow.
 */
export async function connectMidnightWallet(preferredId?: string): Promise<ConnectedMidnightWallet> {
  const wallet = getMidnightConnector(preferredId);
  if (!wallet)
    throw new Error(
      'No Midnight wallet found. Install Lace (Midnight) or 1AM and switch it to the Preview network.',
    );

  const api = await wallet.connector.enable();
  const state = await api.state();
  return {
    api,
    walletId: wallet.id,
    walletLabel: wallet.label,
    address: state.address,
    coinPublicKey: state.coinPublicKey,
    unshieldedNight: sumUnshieldedNight(state.balances),
  };
}
