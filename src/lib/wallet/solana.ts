/**
 * Solana wallet configuration.
 *
 * Supports Phantom and Solflare. WalletConnect + Backpack are
 * commented for the v1 cut — they require more setup. Add them in
 * v1.1.
 */

import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';

export function getSolanaWallets() {
  return [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
}
