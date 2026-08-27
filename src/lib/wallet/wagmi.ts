/**
 * wagmi configuration for EVM wallets.
 *
 * Supports MetaMask, WalletConnect, and Coinbase Wallet out of the box.
 * For Phantom-on-EVM, the injected connector picks it up automatically.
 * 
 * Updated to support all SBT certificate chains:
 * - Polygon (Mainnet + Amoy Testnet)
 * - Ethereum (Mainnet + Sepolia Testnet)
 * - BSC (Mainnet + Testnet)
 * - Base, Optimism, Arbitrum
 */

import { http, createConfig } from 'wagmi';
import { mainnet, sepolia, base, optimism, arbitrum, polygon, bsc, bscTestnet, hardhat } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { mock } from '@wagmi/core';

// Polygon Amoy Testnet (不在 wagmi/chains 中，需要手動定義)
const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy Testnet',
  network: 'polygon-amoy',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-amoy.polygon.technology'],
    },
    public: {
      http: ['https://rpc-amoy.polygon.technology'],
    },
  },
  blockExplorers: {
    default: {
      name: 'PolygonScan',
      url: 'https://amoy.polygonscan.com',
    },
  },
  testnet: true,
} as const;

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? '';

/**
 * Read-only wallet impersonation, for recording the demo and for e2e.
 *
 * Set `NEXT_PUBLIC_DEMO_WALLET` to an address and a "Demo wallet (read-only)"
 * connector appears in the picker. It lets the dashboard read that address's
 * real on-chain certificates and run the settlement agent against real chain
 * state, without a browser extension in the loop — which is what makes the
 * split-screen demo reproducible on a machine that has no MetaMask.
 *
 * It is genuinely read-only and cannot be mistaken for more: the mock connector
 * produces no valid signature, so SIWE sign-in, minting and any other write path
 * all fail with it. It reads public chain data, which anyone can read anyway.
 *
 * Unset by default, and unset in `wrangler.jsonc`, so production never offers it.
 */
const demoWallet = process.env.NEXT_PUBLIC_DEMO_WALLET ?? '';

export const wagmiConfig = createConfig({
  chains: [
    // Mainnets
    mainnet,
    polygon,
    bsc,
    base,
    optimism,
    arbitrum,
    // Testnets
    sepolia,
    polygonAmoy,
    bscTestnet,
    // Local node. Inert unless someone has started one and pointed the SBT
    // address env var at it — see `contracts/scripts/local-demo.js`, which is
    // how the settlement path is exercised without spending testnet gas.
    hardhat,
  ],
  connectors: [
    // The Coinbase Wallet browser extension is still discovered here via
    // EIP-6963. The dedicated coinbaseWallet() connector is deliberately not
    // registered: it bundles the Coinbase Wallet SDK, whose analytics beacon to
    // cca-lite.coinbase.com throws a "Failed to fetch" in the console on every
    // load (and is blocked outright by ad blockers) for no user-facing benefit.
    injected({ shimDisconnect: true }),
    ...(wcProjectId ? [walletConnect({ projectId: wcProjectId, showQrModal: true })] : []),
    ...(demoWallet
      ? [mock({ accounts: [demoWallet as `0x${string}`], features: { defaultConnected: true } })]
      : []),
  ],
  transports: {
    // Mainnets
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    // Testnets
    [sepolia.id]: http(),
    [polygonAmoy.id]: http(),
    [bscTestnet.id]: http(),
    [hardhat.id]: http(),
  },
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}

// Export for use in other parts of the app
export { polygonAmoy };
