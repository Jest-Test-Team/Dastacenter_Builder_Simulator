/**
 * Mint the certificate on the Midnight Preview testnet.
 *
 * Connects Lace, shows the unshielded NIGHT balance, and runs the Midnight mint
 * — streaming the same terminal console the Sepolia flow uses. The wallet,
 * balance and local witness are real; the on-chain call reports the current
 * upstream toolchain block precisely rather than faking a transaction.
 */

'use client';

import { useState } from 'react';
import { Loader2, Award, ExternalLink } from 'lucide-react';
import { useBuildStore } from '@/lib/store/build-store';
import { MidnightWalletBadge } from '@/components/cert/MidnightWalletBadge';
import { ZkProvingConsole, type ConsoleLine } from '@/components/cert/ZkProvingConsole';
import { mintCertificateOnMidnight, type MidnightMintResult } from '@/lib/midnight/mint';
import type { ConnectedMidnightWallet } from '@/lib/midnight/wallet';

export function MidnightMintPanel() {
  const [wallet, setWallet] = useState<ConnectedMidnightWallet | null>(null);
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState<MidnightMintResult | null>(null);
  const [trace, setTrace] = useState<ConsoleLine[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleStatus, setConsoleStatus] = useState<'running' | 'done' | 'failed'>('running');
  const [error, setError] = useState<string | null>(null);

  const say = (tone: ConsoleLine['tone'], text: string) =>
    setTrace((current) => [...current, { tone, text }]);

  async function handleMint() {
    setMinting(true);
    setError(null);
    setTrace([]);
    setConsoleStatus('running');
    setConsoleOpen(true);
    try {
      const snapshot = useBuildStore.getState().exportSnapshot();
      const result = await mintCertificateOnMidnight(snapshot, {
        onStage: (event) => {
          switch (event.stage) {
            case 'wallet':
              say('ok', `Lace connected · unshielded NIGHT: ${event.unshieldedNight}`);
              say('info', 'Fees paid in tDUST generated from your unshielded tNIGHT.');
              break;
            case 'witness':
              say('local', 'Deriving threshold witness in-browser (design stays local)…');
              say('local', `  graphDigest = ${event.graphDigest.slice(0, 30)}…`);
              say('info', `Circuit: datacenter-score/v1 · rule pack ${event.rulePackVersion}`);
              say('info', `Claim: efficiency score (0-100) >= ${event.threshold}`);
              break;
            case 'submitting':
              say('info', `Submitting mintCertificate to ${event.contractAddress.slice(0, 18)}… on Midnight Preview`);
              break;
            case 'minted':
              say('ok', `Minted on Midnight · tx ${event.txId.slice(0, 26)}…`);
              break;
            case 'unavailable':
              say('fail', event.reason);
              break;
          }
        },
      });
      say('ok', 'Certificate recorded on the Midnight ledger — commitment only, design private.');
      setConsoleStatus('done');
      setMinted(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Midnight mint failed';
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
          itself is never published. Fees are paid from your <strong>unshielded NIGHT</strong>.
        </p>
      </div>

      <MidnightWalletBadge onConnected={setWallet} />

      {minted ? (
        <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
          <p className="flex items-center gap-2 text-lg font-bold text-success">
            <Award className="h-5 w-5" /> Minted on Midnight!
          </p>
          <p className="mt-1 break-all font-mono text-[10px] text-fg-muted">tx {minted.txId}</p>
        </div>
      ) : (
        <>
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            onClick={() => void handleMint()}
            disabled={minting || !wallet}
            className="btn w-full"
          >
            {minting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Minting on Midnight…
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
