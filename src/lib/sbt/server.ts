import { Contract, Interface, JsonRpcProvider, Wallet, getAddress } from 'ethers';
import type { Address } from 'viem';
import type { BuildSnapshot } from '@/lib/store/build-store';
import { score, type RatingReport } from '@/lib/scoring';
import { stableSnapshotHash } from '@/lib/utils/identity';
import { getChainConfig, getExplorerUrl, getRpcUrl, isTestnetChain } from './chains';
import { computeBlueprintHash, getSBTContractAddress } from './client';
import {
  buildCertificateMetadata,
  uploadMetadataAuto,
  type PrivacyClaim,
  type StorageResult,
} from './metadata';
import { DEFAULT_THRESHOLD, getProver, type Proof } from '@/lib/zk';
import { SBT_CONTRACT_ABI } from './abi';

export interface MintCertificateServerInput {
  snapshot: BuildSnapshot;
  recipientAddress: string;
  recipientName?: string;
  svgDataUri: string;
  chainId?: number;
  buildId?: string;
  baseUrl?: string;
  /**
   * Zero-knowledge threshold proof. Required: the certificate asserts that the
   * design cleared the bar, and that assertion has to be checked before it is
   * written to a chain, where it cannot be taken back.
   */
  proof: Proof;
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
  privacy: PrivacyClaim;
}

export class MintError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Checks the proof and returns the public claim the certificate will carry.
 * Throws rather than returning a flag: there is no partial success here.
 */
async function verifyMintProof(proof: Proof, rulePackVersion: string): Promise<PrivacyClaim> {
  if (!proof) throw new MintError(400, 'A zero-knowledge threshold proof is required to mint');

  const result = await getProver().verify(proof, {
    threshold: DEFAULT_THRESHOLD,
    rulePackVersion,
  });
  if (!result.valid) throw new MintError(400, `Proof rejected: ${result.reason ?? 'invalid proof'}`);

  return {
    commitment: proof.statement.commitment,
    threshold: proof.statement.threshold,
    rulePackVersion: proof.statement.rulePackVersion,
    circuit: proof.statement.circuit,
    backend: proof.backend,
  };
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

  // The human gate sits on the irreversible edge. Minting writes to a chain, so
  // the proof is verified here — before the transaction — and the proof must
  // have been made under the same rule pack that judged this build, or a lax
  // pack could be used to clear a strict bar.
  const privacy = await verifyMintProof(input.proof, report.rulePackVersion);

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
    privacy,
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
    privacy,
  };
}
