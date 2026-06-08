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
import { mainnet, sepolia, base, optimism, arbitrum, polygon, bsc, bscTestnet } from 'wagmi/chains';
import { injected, metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors';

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
  ],
  connectors: [
    injected({ shimDisconnect: true }),
    metaMask(),
    ...(wcProjectId ? [walletConnect({ projectId: wcProjectId, showQrModal: true })] : []),
    coinbaseWallet({ appName: 'Datacenter Builder Simulator' }),
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

