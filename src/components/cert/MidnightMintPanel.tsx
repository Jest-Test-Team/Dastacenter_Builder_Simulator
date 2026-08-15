/**
 * Mint the certificate on the Midnight Preview testnet.
 *
 * Connects Lace / 1AM, shows the unshielded NIGHT balance, and runs the Midnight
 * mint — streaming the same terminal console the Sepolia flow uses. The wallet,
 * balance and local witness are real. When the on-chain step hits the upstream
 * ledger-v8/v9 toolchain gap, this is presented as a **cross-chain fallback**:
 * the ZK verification status is shown as a status-light log, and the same proof
 * is routed to Sepolia — never a red failure, never a fabricated Midnight tx.
 */

'use client';

import { useEffect, useState } from 'react';
import { Loader2, Award, ExternalLink } from 'lucide-react';
import { useBuildStore } from '@/lib/store/build-store';
import { MidnightWalletBadge } from '@/components/cert/MidnightWalletBadge';
import { MidnightZkStatus } from '@/components/cert/MidnightZkStatus';
import { ZkProvingConsole, type ConsoleLine } from '@/components/cert/ZkProvingConsole';
import {
  mintCertificateOnMidnight,
  MidnightUnavailableError,
  type MidnightMintResult,
} from '@/lib/midnight/mint';
import { acquireThresholdProof } from '@/lib/zk/client';
import type { Proof } from '@/lib/zk/types';
import { useMidnightWallet } from '@/lib/midnight/store';

interface ZkStatusData {
  walletLabel?: string;
  unshieldedNight?: string;
  graphDigest?: string;
  threshold?: number;
  rulePackVersion?: string;
}

export function MidnightMintPanel({
  onMintOnSepolia,
}: {
  onMintOnSepolia?: (proof: Proof) => void;
}) {
  const wallet = useMidnightWallet();
  const connected = wallet.isConnected();
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState<MidnightMintResult | null>(null);
  const [trace, setTrace] = useState<ConsoleLine[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleStatus, setConsoleStatus] = useState<'running' | 'done' | 'failed'>('running');
  const [error, setError] = useState<string | null>(null);
  const [fallbackActive, setFallbackActive] = useState(false);
  const [status, setStatus] = useState<ZkStatusData>({});
  const [pendingProof, setPendingProof] = useState<Proof | null>(null);

  // Show the ZK verification status for a beat so the cross-chain fallback is
  // legible, then auto-route the same proof to Sepolia.
  useEffect(() => {
    if (!fallbackActive || !pendingProof || !onMintOnSepolia) return;
    const timer = window.setTimeout(() => onMintOnSepolia(pendingProof), 2600);
    return () => window.clearTimeout(timer);
  }, [fallbackActive, pendingProof, onMintOnSepolia]);

  const say = (tone: ConsoleLine['tone'], text: string) =>
    setTrace((current) => [...current, { tone, text }]);

  async function handleMint() {
    setMinting(true);
    setError(null);
    setTrace([]);
    setFallbackActive(false);
    setConsoleStatus('running');
    setConsoleOpen(true);

    setStatus({ walletLabel: wallet.walletLabel ?? undefined, unshieldedNight: wallet.unshieldedNight ?? undefined });
    say('ok', `${wallet.walletLabel ?? 'Wallet'} connected · unshielded NIGHT: ${wallet.unshieldedNight ?? '—'}`);

    try {
      const snapshot = useBuildStore.getState().exportSnapshot();

      // 1. Generate the REAL threshold ZK proof locally — this is the proof that
      //    will back the certificate, whichever chain settles it.
      const { proof } = await acquireThresholdProof(snapshot, {
        onStage: (event) => {
          switch (event.stage) {
            case 'graph':
              if (event.nodeCount !== undefined)
                say('local', `Graph fused: ${event.nodeCount} nodes · ${event.edgeCount} edges (local).`);
              break;
            case 'witness':
              setStatus((s) => ({
                ...s,
                graphDigest: event.graphDigest,
                threshold: event.threshold,
                rulePackVersion: event.rulePackVersion,
              }));
              say('local', 'Deriving threshold witness in-browser (design stays local)…');
              say('local', `  graphDigest = ${event.graphDigest.slice(0, 30)}…`);
              say('info', `Circuit: ${event.circuit} · rule pack ${event.rulePackVersion}`);
              say('info', `Claim: efficiency score (0-100) >= ${event.threshold}`);
              break;
            case 'proving':
              say('info', 'Generating UltraHonk zero-knowledge proof…');
              break;
            case 'proved':
              say('ok', `Proof generated · ${event.proofBytes} bytes · ${event.publicInputCount} public inputs.`);
              break;
            case 'verified':
              say('ok', 'Local verification passed — proof is self-consistent.');
              break;
            case 'rejected':
              say('fail', `Assert (score >= threshold) … FAIL — ${event.message}`);
              break;
          }
        },
      });

      // 2. Attempt Midnight settlement. Until Midnight ships ledger-v9 this
      //    throws MidnightUnavailableError — a genuine attempt, never a fake tx.
      try {
        const result = await mintCertificateOnMidnight(snapshot, {
          walletId: wallet.walletId ?? undefined,
          onStage: (event) => {
            if (event.stage === 'submitting')
              say('info', `Submitting mintCertificate to ${event.contractAddress.slice(0, 18)}… on Midnight Preview`);
            if (event.stage === 'minted') say('ok', `Minted on Midnight · tx ${event.txId.slice(0, 26)}…`);
          },
        });
        say('ok', 'Certificate recorded on the Midnight ledger — commitment only, design private.');
        setConsoleStatus('done');
        setMinted(result);
        return;
      } catch (err) {
        if (!(err instanceof MidnightUnavailableError)) throw err;

        // 3. Cross-chain fallback: hand the SAME proof to the Sepolia mint. The
        //    ZK verification already succeeded; this just changes the settlement
        //    layer. Present as a fallback, not a red failure.
        say('ok', 'ZK verification complete — Midnight Preview is on ledger-v9, ahead of the public toolchain.');
        say('ok', 'Cross-chain fallback: routing the same proof to Ethereum Sepolia…');
        setPendingProof(proof);
        setFallbackActive(true);
        setConsoleStatus('done');
        setConsoleOpen(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setTrace((current) =>
        current.some((line) => line.tone === 'fail') ? current : [...current, { tone: 'fail', text: message }],
      );
      setConsoleStatus('failed');
      setError(message);
    } finally {
      setMinting(false);
    }
  }

  return (
    <div className="space-y-3">
      <ZkProvingConsole
        open={consoleOpen}
        lines={trace}
        status={consoleStatus}
        onClose={() => setConsoleOpen(false)}
      />

      <div className="rounded border border-indigo-400/30 bg-indigo-500/5 p-3 text-xs text-fg-muted">
        <p>
          Midnight is a privacy-first Cardano partner chain: the certificate is recorded by a{' '}
          <span className="font-mono">Compact</span> contract as a blinded commitment, so the design
          itself is never published. Fees are paid in <strong>DUST</strong>, generated from your
          unshielded NIGHT.
        </p>
      </div>

      <MidnightWalletBadge />

      {minted ? (
        <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
          <p className="flex items-center gap-2 text-lg font-bold text-success">
            <Award className="h-5 w-5" /> Minted on Midnight!
          </p>
          <p className="mt-1 break-all font-mono text-[10px] text-fg-muted">tx {minted.txId}</p>
        </div>
      ) : fallbackActive ? (
        <>
          <MidnightZkStatus
            walletLabel={status.walletLabel ?? wallet.walletLabel}
            unshieldedNight={status.unshieldedNight ?? wallet.unshieldedNight}
            graphDigest={status.graphDigest}
            threshold={status.threshold}
            rulePackVersion={status.rulePackVersion}
            autoRouting={pendingProof !== null}
            onMintOnSepolia={
              pendingProof && onMintOnSepolia ? () => onMintOnSepolia(pendingProof) : undefined
            }
          />
          {trace.length > 0 && (
            <button
              type="button"
              onClick={() => setConsoleOpen(true)}
              className="w-full text-center text-[10px] text-fg-muted underline-offset-2 hover:underline"
            >
              Show proof log
            </button>
          )}
        </>
      ) : (
        <>
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            onClick={() => void handleMint()}
            disabled={minting || !connected}
            className="btn w-full"
          >
            {minting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying &amp; minting…
              </>
            ) : (
              <>
                <Award className="h-4 w-4" /> Mint on Midnight Preview
              </>
            )}
          </button>
          {trace.length > 0 && !consoleOpen && (
            <button
              type="button"
              onClick={() => setConsoleOpen(true)}
              className="w-full text-center text-[10px] text-fg-muted underline-offset-2 hover:underline"
            >
              Show proof log
            </button>
          )}
          <a
            href="https://docs.midnight.network/relnotes/overview"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-accent hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> Midnight Preview network
          </a>
        </>
      )}
    </div>
  );
}
