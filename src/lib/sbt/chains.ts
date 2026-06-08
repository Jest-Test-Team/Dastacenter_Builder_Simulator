/**
 * Multi-chain configuration for SBT deployment
 * 
 * Supports:
 * - Polygon Amoy Testnet
 * - Polygon Mainnet
 * - Ethereum Mainnet
 * - Ethereum Sepolia Testnet
 * - BSC Mainnet
 * - BSC Testnet
 * - Arbitrum One
 * - Optimism
 * - Base
 */

export interface ChainConfig {
  chainId: number;
  name: string;
  network: string;
  isTestnet: boolean;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  sbtContractAddress?: string; // Will be filled after deployment
  faucetUrl?: string; // For testnets
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  // Polygon Amoy Testnet (替代 Mumbai)
  'polygon-amoy': {
    chainId: 80002,
    name: 'Polygon Amoy Testnet',
    network: 'polygon-amoy',
    isTestnet: true,
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    blockExplorer: 'https://www.oklink.com/amoy',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    faucetUrl: 'https://faucet.polygon.technology/',
    // sbtContractAddress: '0x...', // 部署後填入
  },

  // Polygon Mainnet
  'polygon': {
    chainId: 137,
    name: 'Polygon Mainnet',
    network: 'polygon',
    isTestnet: false,
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
  },

  // Ethereum Sepolia Testnet
  'sepolia': {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    network: 'sepolia',
    isTestnet: true,
    rpcUrl: 'https://rpc.sepolia.org',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    faucetUrl: 'https://sepoliafaucet.com/',
  },

  // Ethereum Mainnet
  'ethereum': {
    chainId: 1,
    name: 'Ethereum Mainnet',
    network: 'mainnet',
    isTestnet: false,
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
  },

  // BSC Testnet
  'bsc-testnet': {
    chainId: 97,
    name: 'BSC Testnet',
    network: 'bsc-testnet',
    isTestnet: true,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    blockExplorer: 'https://testnet.bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    faucetUrl: 'https://testnet.bnbchain.org/faucet-smart',
  },

  // BSC Mainnet
  'bsc': {
    chainId: 56,
    name: 'BNB Smart Chain',
    network: 'bsc',
    isTestnet: false,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    blockExplorer: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
  },

  // Arbitrum One
  'arbitrum': {
    chainId: 42161,
    name: 'Arbitrum One',
    network: 'arbitrum',
    isTestnet: false,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
  },

  // Optimism
  'optimism': {
    chainId: 10,
    name: 'Optimism',
    network: 'optimism',
    isTestnet: false,
    rpcUrl: 'https://mainnet.optimism.io',
    blockExplorer: 'https://optimistic.etherscan.io',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
  },

  // Base
  'base': {
    chainId: 8453,
    name: 'Base',
    network: 'base',
    isTestnet: false,
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
  },
};

export function getChainConfig(chainIdOrNetwork: number | string): ChainConfig | null {
  if (typeof chainIdOrNetwork === 'number') {
    return Object.values(SUPPORTED_CHAINS).find((c) => c.chainId === chainIdOrNetwork) ?? null;
  }
  return SUPPORTED_CHAINS[chainIdOrNetwork] ?? null;
}

export function getTestnetChains(): ChainConfig[] {
  return Object.values(SUPPORTED_CHAINS).filter((c) => c.isTestnet);
}

export function getMainnetChains(): ChainConfig[] {
  return Object.values(SUPPORTED_CHAINS).filter((c) => !c.isTestnet);
}

export function isTestnetChain(chainId: number): boolean {
  const config = getChainConfig(chainId);
  return config?.isTestnet ?? false;
}

/**
 * 獲取測試網的 faucet URL（用於提醒用戶獲取測試代幣）
 */
export function getFaucetUrl(chainId: number): string | null {
  const config = getChainConfig(chainId);
  return config?.faucetUrl ?? null;
}

/**
 * 獲取區塊鏈瀏覽器 URL
 */
export function getExplorerUrl(chainId: number, address: string, type: 'address' | 'tx' = 'address'): string {
  const config = getChainConfig(chainId);
  if (!config) return '';
  return `${config.blockExplorer}/${type}/${address}`;
}
