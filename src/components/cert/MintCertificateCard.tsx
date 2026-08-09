/**
 * Reusable "mint your certificate as a Soulbound NFT" card.
 *
 * Handles wallet connection, chain selection, and relaying the mint through
 * /api/sbt/mint (the server signs with the contract-owner minter key, so the
 * mint is gasless for the user and the SBT lands in their connected wallet).
 *
 * Used on both the result page and the dedicated certificate page.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import type { Hash } from 'viem';
import { Award, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import type { RatingReport } from '@/lib/scoring';
import { useBuildStore } from '@/lib/store/build-store';
import { CertificateSvg } from '@/components/cert/CertificateSvg';
import { WalletPicker } from '@/components/wallet/WalletPicker';
import {
  computeBlueprintHash,
  getSBTContractAddress,
  hasCertificate,
  getTestnetTokenReminder,
} from '@/lib/sbt/client';
import { isTestnetChain, SUPPORTED_CHAINS } from '@/lib/sbt/chains';
import type { MintCertificateServerResult } from '@/lib/sbt/server';
import { acquireThresholdProof } from '@/lib/zk/client';

const DEFAULT_CHAIN_ID = 11155111; // Ethereum Sepolia
const ALL_CHAINS = Object.values(SUPPORTED_CHAINS);
const MINTABLE_CHAINS = ALL_CHAINS.filter((chain) => getSBTContractAddress(chain.chainId));

export function MintCertificateCard({
  report,
  buildId,
}: {
  report: RatingReport;
  buildId: string;
}) {
  const { address, isConnected, chain } = useAccount();
  const [selectedChainId, setSelectedChainId] = useState<number>(DEFAULT_CHAIN_ID);
  // Read from the chain the SBT lives on, not whatever the wallet is on.
  const publicClient = usePublicClient({ chainId: selectedChainId as 11155111 });

  const svgWrapRef = useRef<HTMLDivElement>(null);
  const [recipientName, setRecipientName] = useState('');
  const [blueprintHash, setBlueprintHash] = useState<Hash | ''>('');
  const [alreadyMinted, setAlreadyMinted] = useState(false);
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState<MintCertificateServerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compute the blueprint hash from the current build snapshot.
  useEffect(() => {
    try {
      setBlueprintHash(computeBlueprintHash(useBuildStore.getState().exportSnapshot()));
    } catch {
      /* snapshot not ready yet */
    }
  }, [buildId]);

  // Prefer the wallet's current chain if it's one we support.
  useEffect(() => {
    if (
      chain &&
      MINTABLE_CHAINS.some((c) => c.chainId === chain.id)
    ) {
      setSelectedChainId(chain.id);
      return;
    }
    if (!MINTABLE_CHAINS.some((c) => c.chainId === selectedChainId) && MINTABLE_CHAINS[0]) {
      setSelectedChainId(MINTABLE_CHAINS[0].chainId);
    }
  }, [chain, selectedChainId]);

  // Check whether this blueprint was already minted on the selected chain.
  useEffect(() => {
    if (!blueprintHash || !publicClient) return;
    void (async () => {
      try {
        setAlreadyMinted(await hasCertificate(blueprintHash, selectedChainId, publicClient));
      } catch {
        setAlreadyMinted(false);
      }
    })();
  }, [blueprintHash, selectedChainId, publicClient]);

  function buildSvgDataUri(): string | null {
    const svg = svgWrapRef.current?.querySelector<SVGElement>('[data-cert-svg]');
    if (!svg) return null;
    const xml = new XMLSerializer().serializeToString(svg);
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`;
  }

  async function handleMint() {
    if (!address || !isConnected) return;
    const svgDataUri = buildSvgDataUri();
    if (!svgDataUri) {
      setError('Certificate image not ready yet, please retry.');
      return;
    }

    setMinting(true);
    setError(null);
    try {
      const snapshot = useBuildStore.getState().exportSnapshot();
      // The graph digest is computed locally and only the threshold witness
      // leaves the browser; the mint is gated on the resulting proof.
      const { proof } = await acquireThresholdProof(snapshot);
      const res = await fetch('/api/sbt/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // buildId is intentionally omitted: the server derives it from the
          // snapshot, which avoids a "Build ID mismatch" when the result page
          // scores an in-memory build whose id differs from the route param.
          snapshot,
          recipientAddress: address,
          recipientName: recipientName || 'Anonymous Builder',
          svgDataUri,
          chainId: selectedChainId,
          proof,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | MintCertificateServerResult
        | { error?: string }
        | null;
      if (!res.ok) {
        if (res.status === 409) setAlreadyMinted(true);
        throw new Error(data && 'error' in data && data.error ? data.error : 'Minting failed');
      }
      setMinted(data as MintCertificateServerResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Minting failed');
    } finally {
      setMinting(false);
    }
  }

  return (
    <section className="panel p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Award className="h-5 w-5 text-warn" />
        Mint as Soulbound NFT
      </h2>
      <p className="mt-1 text-sm text-fg-muted">
        Permanent, non-transferable certificate minted to your wallet. The server relays the
        transaction, so minting is free for you.
      </p>

      {/* Off-screen certificate used only to generate the metadata image. */}
      <div ref={svgWrapRef} aria-hidden className="pointer-events-none absolute -left-[9999px] top-0 w-[1000px]">
        <CertificateSvg
          report={report}
          recipientName={recipientName || 'Anonymous Builder'}
          recipientWallet={address ?? ''}
          buildId={buildId}
        />
      </div>

      {minted ? (
        <div className="mt-4 rounded border border-success/30 bg-success/10 p-3 text-sm">
          <p className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-4 w-4" /> Certificate minted!
          </p>
          <p className="mt-1 text-xs text-fg-muted">Token ID: #{minted.tokenId.toString()}</p>
          <p className="mt-1 text-[10px] text-fg-muted">
            Tx: <span className="font-mono">{minted.transactionHash.slice(0, 18)}…</span>
          </p>
          <p className="mt-1 text-[10px] text-fg-muted">
            Storage: {minted.metadata.provider.toUpperCase()}
          </p>
          <a
            href={minted.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View on explorer
          </a>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {!isConnected && (
            <div className="rounded border border-border bg-bg-subtle p-3">
              <p className="mb-2 text-xs text-fg-muted">Connect a wallet to receive your NFT.</p>
              <WalletPicker />
            </div>
          )}

          {/* Chain selector */}
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Select blockchain</label>
            <select
              className="input text-sm"
              value={selectedChainId}
              onChange={(e) => setSelectedChainId(Number(e.target.value))}
            >
              <optgroup label="Testnets">
                {ALL_CHAINS
                  .filter((c) => c.isTestnet)
                  .map((c) => (
                    <option key={c.chainId} value={c.chainId} disabled={!getSBTContractAddress(c.chainId)}>
                      {c.name} ({c.nativeCurrency.symbol})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Mainnets">
                {ALL_CHAINS
                  .filter((c) => !c.isTestnet)
                  .map((c) => (
                    <option key={c.chainId} value={c.chainId} disabled={!getSBTContractAddress(c.chainId)}>
                      {c.name} ({c.nativeCurrency.symbol})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {isTestnetChain(selectedChainId) && (
            <div className="rounded border border-warn/30 bg-warn/10 p-2 text-xs">
              <p className="flex items-start gap-1.5 text-warn">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span>{getTestnetTokenReminder(selectedChainId)}</span>
              </p>
            </div>
          )}

          {alreadyMinted && (
            <div className="rounded border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
              <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
              This blueprint already has a certificate on this chain.
            </div>
          )}

          <input
            className="input"
            placeholder="Your name (optional)"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />

          {error && <p className="text-xs text-danger">{error}</p>}

          <button
            onClick={() => void handleMint()}
            disabled={minting || !isConnected || !blueprintHash || alreadyMinted}
            className="btn w-full"
          >
            {minting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Minting…
              </>
            ) : (
              <>
                <Award className="h-4 w-4" /> Mint Certificate
              </>
            )}
          </button>

          {blueprintHash && (
            <p className="text-[10px] text-fg-muted">
              Blueprint hash: <span className="font-mono">{blueprintHash.slice(0, 22)}…</span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
