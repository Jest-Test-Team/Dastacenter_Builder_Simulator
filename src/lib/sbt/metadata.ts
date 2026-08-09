/**
 * Metadata storage comparison: IPFS vs Arweave vs On-chain
 * 
 * 成本分析 (2026):
 * 
 * 1. IPFS (通過 Pinata/NFT.Storage)
 *    - 成本: ~免費 (NFT.Storage) 或 $0.15/GB/月 (Pinata)
 *    - 優點: 快速、便宜、廣泛支援
 *    - 缺點: 需要持續 pinning，否則可能丟失
 * 
 * 2. Arweave
 *    - 成本: ~$5-10 per MB (一次性永久儲存)
 *    - 優點: 永久儲存、不需維護
 *    - 缺點: 前期成本較高
 * 
 * 3. On-chain (直接存在合約)
 *    - 成本: ~32,000 gas per KB (~$0.50-5 depending on gas price)
 *    - 優點: 最安全、完全去中心化
 *    - 缺點: 非常昂貴、有大小限制
 * 
 * 結論: 對於憑證 metadata (通常 < 10KB)
 * - 測試網: IPFS (免費、快速)
 * - 主網小檔案 (<5KB): On-chain (最安全)
 * - 主網大檔案: Arweave (永久、一次性付費)
 */

import type { RatingReport } from '@/lib/scoring';

export interface CertificateMetadata {
  name: string;
  description: string;
  image: string; // SVG data URI or IPFS/Arweave hash
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  certificate: {
    buildId: string;
    blueprintHash: string;
    recipientWallet: string;
    issuedAt: string;
    score: number;
    tier: string;
    certLevel: string;
  };
  /**
   * Present when the certificate was issued against a zero-knowledge threshold
   * proof. The commitment stands in for the design: it is what the holder can
   * later open to an auditor, and it is all a public reader ever gets.
   */
  privacy?: {
    commitment: string;
    threshold: number;
    rulePackVersion: string;
    circuit: string;
    backend: string;
  };
}

/** The public statement a certificate can carry instead of the raw rating. */
export interface PrivacyClaim {
  commitment: string;
  threshold: number;
  rulePackVersion: string;
  circuit: string;
  backend: string;
}

export type StorageProvider = 'ipfs' | 'arweave' | 'onchain';

export interface StorageResult {
  uri: string; // Full URI (ipfs://, ar://, or data URI)
  hash: string; // Content hash
  cost: {
    estimated: number; // In USD
    gasUsed?: bigint; // For on-chain storage
  };
  provider: StorageProvider;
}

function createCompactCertificateSvg(label: string): string {
  const safeLabel = label.replace(/[<>&"]/g, '');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#1e1b4b"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="32" fill="url(#g)"/>
      <circle cx="256" cy="192" r="72" fill="#fbbf24" opacity="0.18"/>
      <text x="256" y="240" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#f8fafc" font-weight="700">Datacenter Builder</text>
      <text x="256" y="276" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#cbd5e1">${safeLabel}</text>
      <text x="256" y="352" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#94a3b8">Verified certificate</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export function createCompactCertificateMetadata(metadata: CertificateMetadata): CertificateMetadata {
  return {
    ...metadata,
    image: createCompactCertificateSvg(metadata.certificate.certLevel),
  };
}

/**
 * 建立憑證 metadata
 */
export function buildCertificateMetadata(
  report: RatingReport,
  buildId: string,
  blueprintHash: string,
  recipientWallet: string,
  recipientName: string,
  svgDataUri: string,
  baseUrl?: string,
  privacy?: PrivacyClaim
): CertificateMetadata {
  const level = report.level;
  const appUrl =
    baseUrl ??
    (typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL) ??
    'https://datacenter-builder.com';

  return {
    name: `Datacenter Builder Certificate - ${level}`,
    description: privacy
      ? `Certificate for a ${level} level datacenter design, proven in zero knowledge to score at least ${privacy.threshold}/100 under rule pack ${privacy.rulePackVersion}. Tier: ${report.tier}. The design itself is not disclosed.`
      : `Certificate for completing a ${level} level datacenter design. Score: ${report.score}/100, Tier: ${report.tier}`,
    image: svgDataUri,
    external_url: `${appUrl.replace(/\/$/, '')}/cert/${buildId}`,
    attributes: [
      { trait_type: 'Level', value: level },
      // Under a privacy claim the exact score never becomes public — the
      // certificate asserts only that the bar was cleared, which is the whole
      // point of proving rather than publishing.
      privacy
        ? { trait_type: 'Score', value: `>= ${privacy.threshold}` }
        : { trait_type: 'Score', value: report.score },
      { trait_type: 'Uptime Tier', value: report.tier },
      { trait_type: 'Recipient', value: recipientName || 'Anonymous Builder' },
      { trait_type: 'Blueprint Hash', value: blueprintHash },
      { trait_type: 'Issued At', value: new Date().toISOString() },
      ...(privacy
        ? [
            { trait_type: 'Graph Commitment', value: privacy.commitment },
            { trait_type: 'Proof Circuit', value: privacy.circuit },
            { trait_type: 'Rule Pack', value: privacy.rulePackVersion },
          ]
        : []),
    ],
    certificate: {
      buildId,
      blueprintHash,
      recipientWallet,
      issuedAt: new Date().toISOString(),
      // Under a privacy claim this records the bar that was cleared, not the
      // exact figure — the metadata document is published, so anything left
      // here is public forever.
      score: privacy ? privacy.threshold : report.score,
      tier: report.tier,
      certLevel: level,
    },
    ...(privacy ? { privacy } : {}),
  };
}

/**
 * 上傳到 IPFS (使用 NFT.Storage 或 Pinata)
 */
export async function uploadToIPFS(metadata: CertificateMetadata): Promise<StorageResult> {
  const nftStorageKey = process.env.NEXT_PUBLIC_NFT_STORAGE_KEY;
  const pinataKey = process.env.NEXT_PUBLIC_PINATA_KEY;

  const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });

  // 優先使用 NFT.Storage (免費)
  if (nftStorageKey) {
    const formData = new FormData();
    formData.append('file', jsonBlob);

    const res = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nftStorageKey}`,
      },
      body: formData,
    });

    if (!res.ok) throw new Error('NFT.Storage upload failed');
    const data = await res.json();
    return {
      uri: `ipfs://${data.value.cid}`,
      hash: data.value.cid,
      cost: { estimated: 0 }, // Free
      provider: 'ipfs',
    };
  }

  // Fallback to Pinata
  if (pinataKey) {
    const formData = new FormData();
    formData.append('file', jsonBlob);

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pinataKey}`,
      },
      body: formData,
    });

    if (!res.ok) throw new Error('Pinata upload failed');
    const data = await res.json();
    return {
      uri: `ipfs://${data.IpfsHash}`,
      hash: data.IpfsHash,
      cost: { estimated: 0.001 }, // ~$0.001 per file
      provider: 'ipfs',
    };
  }

  throw new Error('No IPFS provider configured. Set NEXT_PUBLIC_NFT_STORAGE_KEY or NEXT_PUBLIC_PINATA_KEY');
}

/**
 * 上傳到 Arweave (永久儲存)
 */
export async function uploadToArweave(metadata: CertificateMetadata): Promise<StorageResult> {
  const arweaveKey = process.env.NEXT_PUBLIC_ARWEAVE_KEY;
  if (!arweaveKey) {
    throw new Error('NEXT_PUBLIC_ARWEAVE_KEY not set');
  }

  // 使用 Bundlr/Irys 上傳到 Arweave
  const res = await fetch('https://node1.irys.xyz/tx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${arweaveKey}`,
    },
    body: JSON.stringify({
      data: JSON.stringify(metadata),
      tags: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'App-Name', value: 'Datacenter-Builder' },
      ],
    }),
  });

  if (!res.ok) throw new Error('Arweave upload failed');
  const data = await res.json();

  const sizeKB = JSON.stringify(metadata).length / 1024;
  const estimatedCost = sizeKB * 0.01; // ~$0.01 per KB (永久儲存)

  return {
    uri: `ar://${data.id}`,
    hash: data.id,
    cost: { estimated: estimatedCost },
    provider: 'arweave',
  };
}

/**
 * 儲存到鏈上 (data URI - 適合小檔案 <5KB)
 */
export function createOnChainMetadata(metadata: CertificateMetadata): StorageResult {
  const json = JSON.stringify(metadata);
  const base64 = Buffer.from(json).toString('base64');
  const dataUri = `data:application/json;base64,${base64}`;

  const sizeBytes = json.length;
  const gasPerByte = 68; // Calldata gas cost
  const estimatedGas = BigInt(sizeBytes * gasPerByte);

  // 假設 gas price = 30 gwei, ETH = $2000
  const gasCostEth = Number(estimatedGas) * 30e-9;
  const gasCostUsd = gasCostEth * 2000;

  return {
    uri: dataUri,
    hash: '', // No hash for data URI
    cost: {
      estimated: gasCostUsd,
      gasUsed: estimatedGas,
    },
    provider: 'onchain',
  };
}

/**
 * 自動選擇最便宜的儲存方案
 */
export async function uploadMetadataAuto(
  metadata: CertificateMetadata,
  isTestnet: boolean
): Promise<StorageResult> {
  const jsonSize = JSON.stringify(metadata).length;

  // 測試網: 永遠使用 IPFS (免費且快速)
  if (isTestnet) {
    try {
      return await uploadToIPFS(metadata);
    } catch (err) {
      console.warn('IPFS upload failed, falling back to compact on-chain metadata:', err);
      return createOnChainMetadata(createCompactCertificateMetadata(metadata));
    }
  }

  // 主網: 根據大小選擇
  if (jsonSize < 5000) {
    // < 5KB: 使用鏈上儲存 (最安全)
    return createOnChainMetadata(createCompactCertificateMetadata(metadata));
  }

  // >= 5KB: 優先使用 IPFS，失敗則用 Arweave
  try {
    return await uploadToIPFS(metadata);
  } catch (err) {
    console.warn('IPFS upload failed, trying Arweave:', err);
    return await uploadToArweave(metadata);
  }
}

/**
 * 解析 URI 並返回可訪問的 HTTP URL
 */
export function resolveMetadataUri(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    const hash = uri.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${hash}`;
  }
  if (uri.startsWith('ar://')) {
    const hash = uri.replace('ar://', '');
    return `https://arweave.net/${hash}`;
  }
  if (uri.startsWith('data:')) {
    return uri; // Data URI can be used directly
  }
  return uri; // Assume it's already an HTTP URL
}
