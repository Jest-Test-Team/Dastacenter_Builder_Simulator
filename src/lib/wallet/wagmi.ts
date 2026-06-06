/**
 * wagmi configuration for EVM wallets.
 *
 * Supports MetaMask, WalletConnect, and Coinbase Wallet out of the box.
 * For Phantom-on-EVM, the injected connector picks it up automatically.
 */

import { http, createConfig } from 'wagmi';
import { mainnet, sepolia, base, optimism, arbitrum } from 'wagmi/chains';
import { injected, metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors';

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? '';

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, base, optimism, arbitrum],
  connectors: [
    injected({ shimDisconnect: true }),
    metaMask(),
    ...(wcProjectId ? [walletConnect({ projectId: wcProjectId, showQrModal: true })] : []),
    coinbaseWallet({ appName: 'Datacenter Builder Simulator' }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
  },
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
