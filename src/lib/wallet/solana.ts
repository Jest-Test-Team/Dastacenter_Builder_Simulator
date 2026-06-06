/**
 * Solana wallet configuration.
 *
 * Supports Phantom, Solflare, Backpack, and WalletConnect-via-Solana.
 */

import { createDefaultRpcTransport, createSolanaRpc } from '@solana/kit';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { WalletConnectWalletAdapter } from '@solana/wallet-adapter-walletconnect';

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? '';

export function getSolanaWallets() {
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new BackpackWalletAdapter(),
  ];
  if (wcProjectId) {
    wallets.push(
      new WalletConnectWalletAdapter({
        network: 'mainnet-beta',
        options: { projectId: wcProjectId },
      }) as unknown as (typeof wallets)[number],
    );
  }
  return wallets;
}

export const solanaRpc = createSolanaRpc('https://api.mainnet-beta.solana.com');
