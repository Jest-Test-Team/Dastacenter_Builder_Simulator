import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  type Hex,
} from 'viem';
import { getDemoBuild } from '@/lib/demos';
import { score } from '@/lib/scoring';
import { SBT_CONTRACT_ABI } from '@/lib/sbt/abi';
import {
  buildCertificateMetadata,
  uploadMetadataAuto,
} from '@/lib/sbt/metadata';
import { computeBlueprintHash } from '@/lib/sbt/client';
import { mintCertificateOnChain } from '@/lib/sbt/server';
import { stableSnapshotHash } from '@/lib/utils/identity';
import { buildKnowledgeGraph, graphDigest } from '@/lib/kg';
import { DEFAULT_THRESHOLD, MockProver, type Proof } from '@/lib/zk';

/** Mints are gated on a threshold proof, so every mint test needs a real one. */
async function proofFor(snapshot: Parameters<typeof score>[0], rulePackVersion: string): Promise<Proof> {
  const { graph } = buildKnowledgeGraph(snapshot);
  return new MockProver().prove({
    witness: {
      graphDigest: await graphDigest(graph),
      competitionScore: Math.max(score(snapshot).competitionScore, DEFAULT_THRESHOLD),
      blindingFactor: '0xfeed',
    },
    threshold: DEFAULT_THRESHOLD,
    rulePackVersion,
  });
}

const contractAddress = '0x0e6dF52Ffc02095C8AdE30a7B2Fda67a9FFf88eB';
const recipientAddress = getAddress('0x1234567890abcdef1234567890abcdef12345678');
const minterPrivateKey = '0x59c6995e998f97a5a0044966f094538c9baf6a4f0a1d5bdbd0b2f6d6f6a8d1a9';

type ReceiptLog = { address: string; data: Hex; topics: string[] };

const mocks = vi.hoisted(() => ({
  receiptLogs: [] as ReceiptLog[],
  contractStub: null as
    | {
        hasCertificate: ReturnType<typeof vi.fn>;
        mintCertificate: ReturnType<typeof vi.fn>;
      }
    | null,
}));

vi.mock('@/lib/sbt/metadata', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sbt/metadata')>('@/lib/sbt/metadata');
  return {
    ...actual,
    buildCertificateMetadata: vi.fn(() => ({
      name: 'Mock certificate',
      description: 'Mock certificate metadata',
      image: 'data:image/svg+xml;base64,AAA',
      external_url: 'https://example.com/cert/demo-edge-micro',
      attributes: [],
      certificate: {
        buildId: 'demo-edge-micro',
        blueprintHash: '0x0',
        recipientWallet: recipientAddress,
        issuedAt: '2026-06-09T00:00:00.000Z',
        score: 78,
        tier: 'III',
        certLevel: 'Gold',
      },
    })),
    uploadMetadataAuto: vi.fn(async () => ({
      uri: 'ipfs://mock-certificate-metadata',
      hash: 'QmMockHash',
      cost: { estimated: 0 },
      provider: 'ipfs',
    })),
  };
});

vi.mock('ethers', async () => {
  const actual = await vi.importActual<typeof import('ethers')>('ethers');
  mocks.contractStub = {
    hasCertificate: vi.fn(async () => false),
    mintCertificate: vi.fn(async () => ({
      hash: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      wait: vi.fn(async () => ({ logs: mocks.receiptLogs })),
    })),
  };

  return {
    ...actual,
    JsonRpcProvider: vi.fn().mockImplementation(() => ({ kind: 'provider' })),
    Wallet: vi.fn().mockImplementation(() => ({ kind: 'wallet' })),
    Contract: vi.fn().mockImplementation(() => mocks.contractStub),
  };
});

describe('SBT server mint flow', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_SEPOLIA = contractAddress;
    process.env.SBT_MINTER_PRIVATE_KEY = minterPrivateKey;
    mocks.receiptLogs = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_SEPOLIA;
    delete process.env.SBT_MINTER_PRIVATE_KEY;
  });

  it('mints a certifiable demo snapshot and parses the mint event', async () => {
    const demo = getDemoBuild('edge-micro');
    expect(demo).toBeDefined();
    const snapshot = demo!.snapshot;
    const report = score(snapshot);

    expect(report.certifiable).toBe(true);

    const snapshotBuildId = await stableSnapshotHash(snapshot);
    expect(snapshotBuildId).not.toBe(snapshot.buildId);
    const blueprintHash = computeBlueprintHash(snapshot);

    mocks.receiptLogs = [
      {
        address: contractAddress,
        topics: encodeEventTopics({
          abi: SBT_CONTRACT_ABI,
          eventName: 'CertificateMinted',
          args: [recipientAddress, 1n],
        }),
        data: encodeAbiParameters(
          [
            { type: 'bytes32' },
            { type: 'string' },
          ],
          [blueprintHash, 'ipfs://mock-certificate-metadata'],
        ),
      },
    ];

    const result = await mintCertificateOnChain({
      snapshot,
      recipientAddress,
      recipientName: 'Ada Lovelace',
      svgDataUri: 'data:image/svg+xml;base64,AAA',
      chainId: 11155111,
      buildId: snapshot.buildId,
      baseUrl: 'https://example.com',
      proof: await proofFor(snapshot, report.rulePackVersion),
    });

    expect(result.ok).toBe(true);
    expect(result.buildId).toBe(snapshot.buildId);
    expect(result.blueprintHash).toBe(blueprintHash);
    expect(result.contractAddress).toBe(contractAddress);
    expect(result.tokenId).toBe('1');
    expect(result.transactionHash).toBe(
      '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    );
    expect(result.explorerUrl).toContain('sepolia.etherscan.io');
    expect(uploadMetadataAuto).toHaveBeenCalledTimes(1);
    expect(buildCertificateMetadata).toHaveBeenCalledWith(
      report,
      snapshot.buildId,
      blueprintHash,
      recipientAddress,
      'Ada Lovelace',
      'data:image/svg+xml;base64,AAA',
      'https://example.com',
      expect.objectContaining({ threshold: DEFAULT_THRESHOLD, backend: 'mock' }),
    );
    expect(result.privacy.commitment).toMatch(/^0x[0-9a-f]{64}$/);
    expect(mocks.contractStub).not.toBeNull();
    expect(mocks.contractStub!.hasCertificate).toHaveBeenCalledWith(blueprintHash);
    expect(mocks.contractStub!.mintCertificate).toHaveBeenCalledWith(
      recipientAddress,
      blueprintHash,
      'ipfs://mock-certificate-metadata',
    );
  });
});
