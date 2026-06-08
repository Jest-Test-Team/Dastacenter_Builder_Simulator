/**
 * Certificate page.
 *
 * Shows the cert (SVG-rendered), lets the user download it (PNG/SVG),
 * and mint it as a Soulbound Token (SBT) on multiple EVM chains.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { useLoadBuild } from '@/lib/persist';
import { loadBuildFromIDB } from '@/lib/persist';
import { useBuildStore } from '@/lib/store/build-store';
import { score, type RatingReport } from '@/lib/scoring';
import { stableSnapshotHash } from '@/lib/utils/identity';
import { Award, Download, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { CertificateSvg } from '@/components/cert/CertificateSvg';
import { useT } from '@/lib/i18n/client';
import { WalletPicker } from '@/components/wallet/WalletPicker';
import {
  mintCertificate,
  hasCertificate,
  getTestnetTokenReminder,
  isTestnetChain,
  getExplorerUrl,
  estimateMintGas,
  SUPPORTED_CHAINS,
  type MintResult,
} from '@/lib/sbt';

export default function CertPage() {
  const params = useParams<{ buildId: string }>();
  const buildId = params?.buildId;
  useLoadBuild(buildId ?? null);
  const [report, setReport] = useState<RatingReport | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blueprintHash, setBlueprintHash] = useState('');
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [alreadyMinted, setAlreadyMinted] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<{ eth: string; usd: string } | null>(null);
  const [svgDataUri, setSvgDataUri] = useState('');
  
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const t = useT();

  useEffect(() => {
    if (!buildId) return;
    void (async () => {
      const rec = await loadBuildFromIDB(buildId);
      if (rec) {
        useBuildStore.getState().loadBuild(rec.snapshot);
        setReport(score(rec.snapshot));
        const hash = await stableSnapshotHash(rec.snapshot);
        setBlueprintHash(hash);
        
        // Generate SVG data URI
        setTimeout(() => {
          const svg = document.querySelector<SVGElement>('[data-cert-svg]');
          if (svg) {
            const xml = new XMLSerializer().serializeToString(svg);
            const base64 = btoa(unescape(encodeURIComponent(xml)));
            setSvgDataUri(`data:image/svg+xml;base64,${base64}`);
          }
        }, 100);
      }
    })();
  }, [buildId]);

  // Set default chain (prefer current chain, fallback to Polygon Amoy)
  useEffect(() => {
    if (!selectedChainId && chain) {
      setSelectedChainId(chain.id);
    } else if (!selectedChainId) {
      setSelectedChainId(80002); // Polygon Amoy
    }
  }, [chain, selectedChainId]);

  // Check if already minted on selected chain
  useEffect(() => {
    if (!blueprintHash || !selectedChainId || !publicClient) return;
    void (async () => {
      try {
        const exists = await hasCertificate(blueprintHash as any, selectedChainId, publicClient);
        setAlreadyMinted(exists);
      } catch (err) {
        console.error('Failed to check certificate:', err);
      }
    })();
  }, [blueprintHash, selectedChainId, publicClient]);

  // Estimate gas when chain or address changes
  useEffect(() => {
    if (!address || !selectedChainId || !blueprintHash || !report || !publicClient) return;
    void (async () => {
      try {
        const estimate = await estimateMintGas(
          {
            recipientAddress: address,
            report,
            buildId: buildId ?? '',
            blueprintHash,
            recipientName,
            chainId: selectedChainId,
          },
          publicClient
        );
        setGasEstimate({ eth: estimate.gasCostEth, usd: estimate.gasCostUsd });
      } catch (err) {
        console.error('Failed to estimate gas:', err);
        setGasEstimate(null);
      }
    })();
  }, [address, selectedChainId, blueprintHash, report, publicClient, buildId, recipientName]);

  if (!report) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-fg-muted">
        Loading certificate…
      </div>
    );
  }

  if (!report.certifiable) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="panel max-w-md p-6 text-center">
          <p className="text-lg">This build is not certifiable.</p>
          <p className="mt-2 text-sm text-fg-muted">
            Score {report.score} · Tier {report.tier}
          </p>
          <Link href={`/result/${buildId}`} className="btn mt-4">
            Back to results
          </Link>
        </div>
      </div>
    );
  }

  async function handleMint() {
    if (!buildId || !address || !isConnected || !report || !selectedChainId || !walletClient || !publicClient) {
      return;
    }
    
    setMinting(true);
    setError(null);
    
    try {
      const result = await mintCertificate(
        {
          recipientAddress: address,
          report,
          buildId,
          blueprintHash,
          recipientName: recipientName || 'Anonymous Builder',
          svgDataUri,
          chainId: selectedChainId,
        },
        walletClient,
        publicClient
      );
      
      setMinted(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Minting failed');
    } finally {
      setMinting(false);
    }
  }

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-2xl">🖥️</span>
            <span>Datacenter Builder</span>
          </Link>
          <div className="flex items-center gap-2">
            <WalletPicker />
            <Link href={`/result/${buildId}`} className="btn-ghost text-sm">
              Back to results
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Award className="h-6 w-6 text-warn" />
          {t('cert.title')}
        </h1>
        <p className="mt-1 text-fg-muted">
          Mint it as a Soulbound Token (SBT) on blockchain. The QR code lets anyone verify.
        </p>

        <div className="mt-6">
          <CertificateSvg
            report={report}
            recipientName={recipientName || 'Anonymous Builder'}
            recipientWallet={address ?? ''}
            buildId={buildId ?? ''}
          />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="panel p-5">
            <h2 className="font-semibold">{t('cert.download')}</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Save your certificate for your portfolio.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={() => downloadCert('svg', buildId ?? '')}>
                <Download className="h-4 w-4" /> SVG
              </button>
              <button className="btn-ghost" onClick={() => downloadCert('png', buildId ?? '')}>
                <Download className="h-4 w-4" /> PNG
              </button>
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="font-semibold">Mint as Soulbound Token</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Permanent, non-transferable certificate on blockchain.
            </p>
            
            {minted ? (
              <div className="mt-4 rounded border border-success/30 bg-success/10 p-3 text-sm">
                <p className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" /> Certificate minted!
                </p>
                <p className="mt-1 text-xs text-fg-muted">
                  Token ID: #{minted.tokenId.toString()}
                </p>
                <p className="mt-1 text-[10px] text-fg-muted">
                  Storage: {minted.metadata.provider.toUpperCase()} (${minted.metadata.cost.estimated.toFixed(4)})
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
                {/* Chain selector */}
                <div>
                  <label className="block text-xs text-fg-muted mb-1">Select blockchain</label>
                  <select
                    className="input text-sm"
                    value={selectedChainId ?? ''}
                    onChange={(e) => setSelectedChainId(Number(e.target.value))}
                  >
                    <optgroup label="Testnets">
                      {Object.values(SUPPORTED_CHAINS)
                        .filter((c) => c.isTestnet)
                        .map((c) => (
                          <option key={c.chainId} value={c.chainId}>
                            {c.name} ({c.nativeCurrency.symbol})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Mainnets">
                      {Object.values(SUPPORTED_CHAINS)
                        .filter((c) => !c.isTestnet)
                        .map((c) => (
                          <option key={c.chainId} value={c.chainId}>
                            {c.name} ({c.nativeCurrency.symbol})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                {/* Testnet reminder */}
                {selectedChainId && isTestnetChain(selectedChainId) && (
                  <div className="rounded border border-warn/30 bg-warn/10 p-2 text-xs">
                    <p className="flex items-start gap-1.5 text-warn">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>{getTestnetTokenReminder(selectedChainId)}</span>
                    </p>
                  </div>
                )}

                {/* Already minted warning */}
                {alreadyMinted && (
                  <div className="rounded border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
                    <AlertCircle className="inline h-3.5 w-3.5 mr-1" />
                    This blueprint already has a certificate on this chain.
                  </div>
                )}

                {/* Recipient name */}
                <input
                  className="input"
                  placeholder="Your name (optional)"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />

                {/* Gas estimate */}
                {gasEstimate && (
                  <p className="text-[10px] text-fg-muted">
                    Estimated gas: ~{gasEstimate.eth} {SUPPORTED_CHAINS[Object.keys(SUPPORTED_CHAINS).find(k => SUPPORTED_CHAINS[k].chainId === selectedChainId) ?? '']?.nativeCurrency.symbol} 
                    (${gasEstimate.usd})
                  </p>
                )}

                {error && <p className="text-xs text-danger">{error}</p>}
                
                <button
                  onClick={handleMint}
                  disabled={minting || !isConnected || !blueprintHash || !svgDataUri || alreadyMinted}
                  className="btn w-full"
                >
                  {minting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Minting...
                    </>
                  ) : (
                    <>
                      <Award className="h-4 w-4" />
                      Mint Certificate
                    </>
                  )}
                </button>
                
                <p className="text-[10px] text-fg-muted">
                  Blueprint hash: <span className="font-mono">{blueprintHash || 'pending'}</span>
                </p>
                <p className="text-[10px] text-fg-muted">
                  Soulbound tokens cannot be transferred. By minting you accept the{' '}
                  <Link href="/legal/privacy" className="underline">
                    privacy policy
                  </Link>
                  . You pay gas fees directly.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function downloadCert(_fmt: 'svg' | 'png', _buildId: string) {
  // Find SVG and trigger download
  const svg = document.querySelector<SVGElement>('[data-cert-svg]');
  if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([xml], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dcb-cert-${_buildId}.${_fmt}`;
  a.click();
  URL.revokeObjectURL(url);
}
