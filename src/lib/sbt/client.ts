/**
 * SBT Client - 與智能合約互動的客戶端
 *
 * 功能:
 * - 鑄造憑證 SBT
 * - 查詢用戶的憑證
 * - 驗證憑證真實性
 * - 多鏈支援
 */

import { decodeEventLog, type Address, type Hash, encodePacked, keccak256 } from 'viem';
import type { RatingReport } from '@/lib/scoring';
import type { BuildSnapshot } from '@/lib/store/build-store';
import { getChainConfig, isTestnetChain, getFaucetUrl, getExplorerUrl } from './chains';
import {
  buildCertificateMetadata,
  uploadMetadataAuto,
  resolveMetadataUri,
  type StorageResult,
} from './metadata';
import { SBT_CONTRACT_ABI } from './abi';

export interface MintCertificateParams {
  recipientAddress: Address;
  report: RatingReport;
  buildId: string;
  blueprintHash: string;
  recipientName: string;
  svgDataUri: string;
  chainId: number;
}

export interface MintResult {
  tokenId: bigint;
  transactionHash: Hash;
  metadata: StorageResult;
  explorerUrl: string;
}

export interface CertificateInfo {
  tokenId: bigint;
  blueprintHash: string;
  metadataURI: string;
  metadata?: ReturnType<typeof buildCertificateMetadata>;
  owner: Address;
  mintedAt?: Date;
}

type SbtReceiptLog = {
  address: Address;
  data: `0x${string}`;
  topics: readonly Hash[];
};

type SbtPublicClient = {
  readContract: (args: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<unknown>;
  simulateContract: (args: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    account: Address;
  }) => Promise<{ request: unknown }>;
  waitForTransactionReceipt: (args: { hash: Hash }) => Promise<{ logs: SbtReceiptLog[] }>;
  estimateContractGas: (args: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    account: Address;
  }) => Promise<bigint>;
  getGasPrice: () => Promise<bigint>;
};

type SbtWalletClient = {
  writeContract: (request: unknown) => Promise<Hash>;
};

/**
 * 獲取合約地址（根據鏈 ID）
 */
export function getSBTContractAddress(chainId: number): Address | null {
  const config = getChainConfig(chainId);
  const network = config?.network;
  const envKeys =
    chainId === 80002
      ? ['NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_POLYGON_AMOY']
      : chainId === 1
        ? ['NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_ETHEREUM', 'NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_MAINNET']
        : network
          ? [`NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_${network.toUpperCase().replace(/-/g, '_')}`]
          : [];
  const envOverride = envKeys.map((key) => process.env[key]).find(Boolean);
  return (envOverride || config?.sbtContractAddress || null) as Address | null;
}

/**
 * 計算 blueprint hash (與合約保持一致)
 */
export function computeBlueprintHash(snapshot: BuildSnapshot): Hash {
  const json = JSON.stringify(snapshot);
  return keccak256(encodePacked(['string'], [json]));
}

/**
 * 檢查用戶是否已經鑄造過此憑證
 */
export async function hasCertificate(
  blueprintHash: Hash,
  chainId: number,
  publicClient: SbtPublicClient
): Promise<boolean> {
  const contractAddress = getSBTContractAddress(chainId);
  if (!contractAddress) return false;

  try {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: SBT_CONTRACT_ABI,
      functionName: 'hasCertificate',
      args: [blueprintHash],
    });
    return result as boolean;
  } catch {
    return false;
  }
}

/**
 * 獲取用戶的所有憑證
 */
export async function getUserCertificates(
  userAddress: Address,
  chainId: number,
  publicClient: SbtPublicClient
): Promise<bigint[]> {
  const contractAddress = getSBTContractAddress(chainId);
  if (!contractAddress) return [];

  try {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: SBT_CONTRACT_ABI,
      functionName: 'getCertificates',
      args: [userAddress],
    });
    return result as bigint[];
  } catch {
    return [];
  }
}

/**
 * 獲取憑證詳情
 */
export async function getCertificateInfo(
  tokenId: bigint,
  chainId: number,
  publicClient: SbtPublicClient
): Promise<CertificateInfo | null> {
  const contractAddress = getSBTContractAddress(chainId);
  if (!contractAddress) return null;

  try {
    const [metadataURI, blueprintHashBytes, owner] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: SBT_CONTRACT_ABI,
        functionName: 'tokenURI',
        args: [tokenId],
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: SBT_CONTRACT_ABI,
        functionName: 'getBlueprintHash',
        args: [tokenId],
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
            name: 'ownerOf',
            outputs: [{ internalType: 'address', name: '', type: 'address' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'ownerOf',
        args: [tokenId],
      }),
    ]);

    // 嘗試獲取 metadata
    let metadata;
    try {
      const metadataUrl = resolveMetadataUri(metadataURI as string);
      const res = await fetch(metadataUrl);
      metadata = await res.json();
    } catch {
      // Metadata lookup is best-effort.
    }

    return {
      tokenId,
      blueprintHash: blueprintHashBytes as string,
      metadataURI: metadataURI as string,
      metadata,
      owner: owner as Address,
    };
  } catch {
    return null;
  }
}

/**
 * 鑄造憑證 SBT
 */
export async function mintCertificate(
  params: MintCertificateParams,
  walletClient: SbtWalletClient,
  publicClient: SbtPublicClient
): Promise<MintResult> {
  const { recipientAddress, report, buildId, blueprintHash, recipientName, svgDataUri, chainId } = params;

  // 1. 檢查合約地址
  const contractAddress = getSBTContractAddress(chainId);
  if (!contractAddress) {
    throw new Error(`SBT contract not deployed on chain ${chainId}`);
  }

  // 2. 檢查是否已鑄造
  const blueprintHashBytes = blueprintHash as Hash;
  const exists = await hasCertificate(blueprintHashBytes, chainId, publicClient);
  if (exists) {
    throw new Error('Certificate already minted for this blueprint');
  }

  // 3. 上傳 metadata
  const isTestnet = isTestnetChain(chainId);
  const metadata = buildCertificateMetadata(
    report,
    buildId,
    blueprintHash,
    recipientAddress,
    recipientName,
    svgDataUri
  );

  const storageResult = await uploadMetadataAuto(metadata, isTestnet);

  // 4. 鑄造 SBT
  const { request } = await publicClient.simulateContract({
    address: contractAddress,
    abi: SBT_CONTRACT_ABI,
    functionName: 'mintCertificate',
    args: [recipientAddress, blueprintHashBytes, storageResult.uri],
    account: recipientAddress,
  });

  const txHash = await walletClient.writeContract(request);

  // 5. 等待交易確認
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  // 6. 從事件日誌中提取 tokenId
  let tokenId: bigint | null = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: SBT_CONTRACT_ABI,
        data: log.data,
        topics: [...log.topics] as [`0x${string}`, ...`0x${string}`[]],
      });
      if (decoded.eventName !== 'CertificateMinted') continue;
      tokenId = BigInt(decoded.args.tokenId.toString());
      break;
    } catch {
      // Ignore logs that do not match the mint event ABI.
    }
  }

  if (tokenId === null) {
    throw new Error('Mint event not found in transaction receipt');
  }

  return {
    tokenId,
    transactionHash: txHash,
    metadata: storageResult,
    explorerUrl: getExplorerUrl(chainId, txHash, 'tx'),
  };
}

/**
 * 估算 Gas 費用
 */
export async function estimateMintGas(
  params: Omit<MintCertificateParams, 'svgDataUri'>,
  publicClient: SbtPublicClient
): Promise<{ gasEstimate: bigint; gasCostEth: string; gasCostUsd: string }> {
  const { recipientAddress, chainId, blueprintHash } = params;

  const contractAddress = getSBTContractAddress(chainId);
  if (!contractAddress) {
    throw new Error(`SBT contract not deployed on chain ${chainId}`);
  }

  // 使用假的 metadata URI 來估算
  const dummyUri = 'ipfs://QmDummyHash';

  const gasEstimate = await publicClient.estimateContractGas({
    address: contractAddress,
    abi: SBT_CONTRACT_ABI,
    functionName: 'mintCertificate',
    args: [recipientAddress, blueprintHash as Hash, dummyUri],
    account: recipientAddress,
  });

  // 獲取當前 gas price
  const gasPrice = await publicClient.getGasPrice();
  const gasCostWei = gasEstimate * gasPrice;
  const gasCostEth = (Number(gasCostWei) / 1e18).toFixed(6);

  // 假設 ETH = $2000 (實際應該從 API 獲取)
  const ethPrice = 2000;
  const gasCostUsd = (Number(gasCostEth) * ethPrice).toFixed(2);

  return {
    gasEstimate,
    gasCostEth,
    gasCostUsd,
  };
}

/**
 * 生成測試網 token 提醒訊息
 */
export function getTestnetTokenReminder(chainId: number): string | null {
  if (!isTestnetChain(chainId)) return null;

  const config = getChainConfig(chainId);
  if (!config) return null;

  const faucetUrl = getFaucetUrl(chainId);
  if (!faucetUrl) {
    return `你正在使用 ${config.name} 測試網。請確保你的錢包有足夠的 ${config.nativeCurrency.symbol} 來支付 gas 費用。`;
  }

  return `你正在使用 ${config.name} 測試網。如果你需要測試代幣，可以從 faucet 獲取: ${faucetUrl}`;
}
