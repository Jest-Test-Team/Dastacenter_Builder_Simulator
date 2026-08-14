/**
 * Midnight Preview testnet configuration.
 *
 * All endpoints are env-driven so the same build targets Preview, Preprod, or a
 * local stack. Nothing here is secret — these are public testnet endpoints, so
 * they use NEXT_PUBLIC_ and are safe in the client bundle.
 *
 * The proof server is intentionally *local by default*: it sees the witness in
 * the clear while proving, so pointing it at a shared host would leak the very
 * design the ZK proof exists to protect.
 */

export type MidnightNetwork = 'preview' | 'preprod' | 'mainnet' | 'undeployed';

export interface MidnightConfig {
  network: MidnightNetwork;
  /** Indexer GraphQL (https) + subscriptions (wss). */
  indexerUrl?: string;
  indexerWsUrl?: string;
  /** Node RPC. */
  nodeUrl?: string;
  /** Proof server — run locally; it sees the witness in the clear. */
  proofServerUrl?: string;
  /** Deployed certificate contract address on Preview (from the deploy step). */
  certContractAddress?: string;
  /**
   * Expected holder wallet address (public — safe to ship). Used only to label
   * and sanity-check the connected wallet in the UI; never used to sign.
   */
  walletAddress?: string;
}

export function midnightConfig(env: Record<string, string | undefined> = process.env): MidnightConfig {
  return {
    network: (env.NEXT_PUBLIC_MIDNIGHT_NETWORK as MidnightNetwork) ?? 'preview',
    indexerUrl: env.NEXT_PUBLIC_MIDNIGHT_INDEXER_URL,
    indexerWsUrl: env.NEXT_PUBLIC_MIDNIGHT_INDEXER_WS_URL,
    nodeUrl: env.NEXT_PUBLIC_MIDNIGHT_NODE_URL,
    proofServerUrl: env.NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER_URL,
    certContractAddress: env.NEXT_PUBLIC_MIDNIGHT_CERT_CONTRACT_ADDRESS,
    walletAddress: env.NEXT_PUBLIC_MIDNIGHT_WALLET_ADDRESS,
  };
}

/** Shortens a Midnight bech32 address for display: mn_addr_preview1fk…xnwcn. */
export function shortMidnightAddress(address: string): string {
  if (address.length <= 24) return address;
  return `${address.slice(0, 18)}…${address.slice(-6)}`;
}

/**
 * Whether the on-chain mint path can be attempted: it needs a proof server and
 * a deployed contract, on top of a connected wallet (checked separately). The
 * UI uses this to show an honest "setup required" state instead of a dead
 * button — we never present a mint that cannot happen as if it could.
 */
export function isMidnightMintConfigured(config: MidnightConfig = midnightConfig()): boolean {
  return Boolean(config.proofServerUrl && config.certContractAddress);
}
