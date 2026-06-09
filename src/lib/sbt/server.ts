import { Contract, Interface, JsonRpcProvider, Wallet, getAddress } from 'ethers';
import type { Address } from 'viem';
import type { BuildSnapshot } from '@/lib/store/build-store';
import { score, type RatingReport } from '@/lib/scoring';
import { stableSnapshotHash } from '@/lib/utils/identity';
import { getChainConfig, getExplorerUrl, getRpcUrl, isTestnetChain } from './chains';
import { computeBlueprintHash, getSBTContractAddress } from './client';
import { buildCertificateMetadata, uploadMetadataAuto, type StorageResult } from './metadata';
import { SBT_CONTRACT_ABI } from './abi';

export interface MintCertificateServerInput {
  snapshot: BuildSnapshot;
  recipientAddress: string;
  recipientName?: string;
  svgDataUri: string;
  chainId?: number;
  buildId?: string;
  baseUrl?: string;
}

export interface SerializableStorageResult {
  uri: string;
  hash: string;
  cost: {
    estimated: number;
    gasUsed?: string;
  };
  provider: StorageResult['provider'];
}

export interface MintCertificateServerResult {
  ok: true;
  buildId: string;
  blueprintHash: string;
  chainId: number;
  contractAddress: Address;
  tokenId: string;
  transactionHash: string;
  explorerUrl: string;
  report: RatingReport;
  metadata: SerializableStorageResult;
}

export class MintError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function mintCertificateOnChain(
  input: MintCertificateServerInput,
): Promise<MintCertificateServerResult> {
  const chainId = input.chainId ?? 80002;
  const chain = getChainConfig(chainId);
  if (!chain) throw new MintError(400, `Unsupported chain: ${chainId}`);

  const contractAddress = getSBTContractAddress(chainId);
  if (!contractAddress) throw new MintError(400, `SBT contract not deployed on chain ${chainId}`);

  const snapshot = input.snapshot;
  const report = score(snapshot);
  if (!report.certifiable) {
    throw new MintError(400, `Build is not certifiable (score ${report.score}, tier ${report.tier})`);
  }

  const snapshotBuildId = await stableSnapshotHash(snapshot);
  const resolvedBuildId = input.buildId ?? snapshot.buildId ?? snapshotBuildId;
  if (input.buildId && input.buildId !== snapshotBuildId && input.buildId !== snapshot.buildId) {
    throw new MintError(400, 'Build ID mismatch');
  }

  const recipientAddress = getAddress(input.recipientAddress);
  const blueprintHash = computeBlueprintHash(snapshot);
  const metadata = buildCertificateMetadata(
    report,
    resolvedBuildId,
    blueprintHash,
    recipientAddress,
    input.recipientName ?? 'Anonymous Builder',
    input.svgDataUri,
    input.baseUrl,
  );

  const storageResult = await uploadMetadataAuto(metadata, isTestnetChain(chainId));
  const serializedMetadata: SerializableStorageResult = {
    ...storageResult,
    cost: {
      estimated: storageResult.cost.estimated,
      gasUsed: storageResult.cost.gasUsed?.toString(),
    },
  };

  const privateKey = process.env.SBT_MINTER_PRIVATE_KEY ?? process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new MintError(500, 'Missing SBT_MINTER_PRIVATE_KEY or PRIVATE_KEY');
  }

  const provider = new JsonRpcProvider(getRpcUrl(chainId) ?? chain.rpcUrl);
  const wallet = new Wallet(privateKey, provider);
  const contract = new Contract(contractAddress, SBT_CONTRACT_ABI, wallet) as Contract & {
    hasCertificate(blueprintHash: string): Promise<boolean>;
    mintCertificate(
      recipient: string,
      blueprintHash: string,
      metadataURI: string,
    ): Promise<{
      hash: string;
      wait(): Promise<{ logs: Array<{ address: string; data: string; topics: string[] }> | null } | null>;
    }>;
  };

  const alreadyMinted = await contract.hasCertificate(blueprintHash);
  if (alreadyMinted) {
    throw new MintError(409, 'Certificate already minted for this blueprint');
  }

  const tx = await contract.mintCertificate(recipientAddress, blueprintHash, storageResult.uri);
  const receipt = await tx.wait();
  if (!receipt) {
    throw new MintError(502, 'Transaction broadcast failed before confirmation');
  }

  const iface = new Interface(SBT_CONTRACT_ABI);
  let tokenId: string | null = null;
  for (const log of receipt.logs ?? []) {
    if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;
    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (parsed?.name !== 'CertificateMinted') continue;
      const value = parsed.args?.tokenId;
      if (value === undefined || value === null) continue;
      tokenId = BigInt(value.toString()).toString();
      break;
    } catch {
      // ignore non-matching logs
    }
  }

  if (!tokenId) {
    throw new MintError(502, 'Mint event not found in transaction receipt');
  }

  return {
    ok: true,
    buildId: resolvedBuildId,
    blueprintHash,
    chainId,
    contractAddress,
    tokenId,
    transactionHash: tx.hash,
    explorerUrl: getExplorerUrl(chainId, tx.hash, 'tx'),
    report,
    metadata: serializedMetadata,
  };
}
