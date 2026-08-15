/**
 * "How the zero-knowledge proof works" — the honest explainer.
 *
 * Spells out exactly what the certificate proves, what stays private, where the
 * proving happens, and the two proof systems: Noir (live today) and the Midnight
 * Compact circuit (compiled and ready, gated on Midnight shipping ledger-v9).
 *
 * Everything here matches the real pipeline in src/lib/zk (browser witness +
 * UltraHonk proof) and circuits/datacenter-score.compact — no overclaiming.
 */

'use client';

import { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  Cpu,
  ChevronDown,
  Server,
  KeyRound,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export function ZkExplainer({ threshold = 85, defaultOpen = false }: { threshold?: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-5 py-4 text-left"
      >
        <ShieldCheck className="h-5 w-5 flex-shrink-0 text-emerald-400" />
        <span className="flex-1">
          <span className="block font-semibold">How the zero-knowledge proof works</span>
          <span className="block text-xs text-fg-muted">
            Prove your build is top-tier without disclosing the design.
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-6 border-t border-border px-5 py-5 text-sm">
          {/* One-line thesis */}
          <p className="leading-relaxed text-fg-muted">
            A facility&apos;s real PUE, cooling topology and physical layout are commercial secrets.
            Publishing them to earn a credential is not an option — so the certificate carries a{' '}
            <strong>zero-knowledge proof</strong> of exactly one sentence:
          </p>
          <blockquote className="rounded-md border-l-2 border-emerald-400/50 bg-emerald-400/5 px-4 py-3 text-sm italic">
            &ldquo;I know a data-center design whose knowledge-graph digest is D, which rule pack v0.1.0
            scored at or above the threshold {threshold} — and nothing more is revealed.&rdquo;
          </blockquote>

          {/* Public vs private */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-emerald-400/30 bg-emerald-400/5 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                <Eye className="h-3.5 w-3.5" /> Public — the verifier learns
              </div>
              <ul className="space-y-1 text-xs text-fg-muted">
                <li>• A blinded <strong>commitment</strong> to the design</li>
                <li>• The <strong>rule pack</strong> version that judged it</li>
                <li>• The <strong>threshold</strong> it cleared (≥ {threshold})</li>
              </ul>
            </div>
            <div className="rounded-md border border-danger/30 bg-danger/5 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-danger">
                <Lock className="h-3.5 w-3.5" /> Private — never disclosed
              </div>
              <ul className="space-y-1 text-xs text-fg-muted">
                <li>• The graph digest, and so the whole design</li>
                <li>• The <strong>exact score</strong> — only that it cleared the bar</li>
                <li>• PUE, layout, rack counts, cooling, every asset & edge</li>
              </ul>
            </div>
          </div>

          {/* Where it happens */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 font-medium">
              <Cpu className="h-4 w-4 text-sky-400" /> Where the privacy actually happens
            </div>
            <p className="mb-3 text-xs leading-relaxed text-fg-muted">
              The graph digest and the proof are computed <strong>in your browser</strong>. The design
              never leaves your machine — only the finished proof (carrying just the public statement)
              is submitted when you mint.
            </p>
            <ol className="flex flex-col gap-1 font-mono text-[11px] text-fg-muted sm:flex-row sm:flex-wrap sm:items-center">
              {['your build', 'knowledge graph', 'graph digest', 'witness', 'ZK proof', 'commitment → chain'].map(
                (step, i, arr) => (
                  <li key={step} className="flex items-center gap-1">
                    <span className={`rounded px-1.5 py-0.5 ${i < 4 ? 'bg-amber-400/15 text-amber-300' : 'bg-emerald-400/15 text-emerald-300'}`}>
                      {step}
                    </span>
                    {i < arr.length - 1 && <span className="text-white/30">→</span>}
                  </li>
                ),
              )}
            </ol>
            <p className="mt-2 text-[10px] text-fg-muted">
              Amber = stays local (never transmitted) · green = the only thing that becomes public.
            </p>
          </div>

          {/* Two proof systems */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Live: Noir */}
            <div className="rounded-md border border-emerald-400/30 bg-bg-subtle p-3">
              <div className="mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold">Live now — Noir + Barretenberg</span>
              </div>
              <p className="text-xs leading-relaxed text-fg-muted">
                Your certificate is backed by a <strong>real</strong> UltraHonk zero-knowledge proof,
                generated in-browser (~a few seconds) and verified before minting. It attests to the
                threshold claim and reveals only the commitment.
              </p>
              <ul className="mt-2 space-y-0.5 text-[10px] text-fg-muted">
                <li className="flex items-center gap-1"><KeyRound className="h-3 w-3" /> UltraHonk proof · 3 public inputs</li>
                <li className="flex items-center gap-1"><Server className="h-3 w-3" /> Proves &amp; verifies client-side — no server sees your design</li>
              </ul>
            </div>

            {/* Ready: Midnight Compact */}
            <div className="rounded-md border border-indigo-400/30 bg-bg-subtle p-3">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-300" />
                <span className="text-sm font-semibold">Midnight-ready — Compact circuit</span>
              </div>
              <p className="text-xs leading-relaxed text-fg-muted">
                The same claim is written as a <strong>Midnight Compact</strong> circuit
                (<span className="font-mono">datacenter-score.compact</span>) — it compiles, produces
                proving/verifying keys, and its selective-disclosure <span className="font-mono">openCommitment</span>{' '}
                runs locally.
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-fg-muted">
                The on-chain Midnight mint activates unchanged once Midnight publishes a{' '}
                <strong>ledger-v9</strong> Compact compiler + wallet (the live Preview network is a
                generation ahead of the current public toolchain).
              </p>
            </div>
          </div>

          {/* Selective disclosure footnote */}
          <p className="rounded-md border border-border bg-bg-subtle p-3 text-[11px] leading-relaxed text-fg-muted">
            <strong className="text-fg">Selective disclosure.</strong> If an auditor is entitled to more,
            you can hand them the revealed digest and blinding factor; they re-derive the exact same
            commitment and confirm it matches — without the design ever having been public.
          </p>
        </div>
      )}
    </section>
  );
}
