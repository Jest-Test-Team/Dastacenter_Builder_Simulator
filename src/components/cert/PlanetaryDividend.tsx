/**
 * KSN Planetary Dividend — eligibility preview.
 *
 * The certificate is the machine-readable claim; this panel shows what a KSN
 * settlement agent would do with it: scan the holder's wallet, match certified
 * capacity, and compute a dividend entitlement.
 *
 * IMPORTANT: this is a projection, not a payment. No transfer is made, no
 * agent is running, and nothing here touches funds. The certificates and their
 * attributes are read from chain and are real; the entitlement is arithmetic
 * over a published rate, shown so the settlement story is concrete rather than
 * hand-waved. It is labelled as such on screen, because a number that looks
 * like money you have received — but is not — is the kind of thing a demo must
 * not imply.
 */

'use client';

import { useEffect, useState } from 'react';
import { Bot, Coins, Info } from 'lucide-react';
import type { CertificateInfo } from '@/lib/sbt/client';

type OwnedCert = CertificateInfo & { chainId: number };

/** Published rate card, per certificate per epoch, by certification level. */
const RATE_BY_LEVEL: Record<string, number> = {
  Diamond: 20,
  Platinum: 16,
  Gold: 12,
  Silver: 8,
  Bronze: 5,
};
const DEFAULT_RATE = 5;

function levelOf(cert: OwnedCert): string {
  const attributes = cert.metadata?.attributes ?? [];
  const match = attributes.find(
    (attribute) =>
      attribute.trait_type === 'Level' || attribute.trait_type === 'Certification Level',
  );
  return match ? String(match.value) : 'Bronze';
}

const STEPS = [
  'Scanning connected wallet for KSN-recognised credentials…',
  'Certificate found. Reading commitment and rule pack.',
  'Threshold claim verified against the published rule pack.',
  'Entitlement computed from the rate card.',
];

export function PlanetaryDividend({ certs }: { certs: OwnedCert[] }) {
  const [step, setStep] = useState(0);

  // Walk the agent's steps once on mount. Purely presentational pacing.
  useEffect(() => {
    if (step >= STEPS.length - 1) return;
    const timer = window.setTimeout(() => setStep((current) => current + 1), 900);
    return () => window.clearTimeout(timer);
  }, [step]);

  if (certs.length === 0) return null;

  const lines = certs.map((cert) => {
    const level = levelOf(cert);
    return {
      key: `${cert.chainId}-${cert.tokenId.toString()}`,
      tokenId: cert.tokenId.toString(),
      level,
      rate: RATE_BY_LEVEL[level] ?? DEFAULT_RATE,
    };
  });
  const total = lines.reduce((sum, line) => sum + line.rate, 0);

  return (
    <section className="panel mt-6 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Bot className="h-4 w-4 text-accent" />
        <h3 className="font-semibold">KSN settlement agent</h3>
        <span className="badge ml-auto border-warn/40 bg-warn/10 text-[10px] uppercase tracking-wider text-warn">
          Projection
        </span>
      </div>

      <div className="px-5 py-4">
        <ol className="space-y-1.5 font-mono text-xs">
          {STEPS.slice(0, step + 1).map((text, index) => (
            <li key={index} className="flex gap-2 text-fg-muted">
              <span className={index === step ? 'text-accent' : 'text-success'}>
                {index === step ? '▸' : '✓'}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>

        <div className="mt-4 rounded border border-border bg-bg-subtle p-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-fg-muted">
                <th className="pb-1 text-left font-normal">Certificate</th>
                <th className="pb-1 text-left font-normal">Level</th>
                <th className="pb-1 text-right font-normal">KSN / epoch</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {lines.map((line) => (
                <tr key={line.key}>
                  <td className="py-0.5">#{line.tokenId}</td>
                  <td className="py-0.5">{line.level}</td>
                  <td className="py-0.5 text-right">{line.rate}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-mono font-semibold">
                <td className="pt-1.5" colSpan={2}>
                  Entitlement
                </td>
                <td className="pt-1.5 text-right text-success">
                  <Coins className="mr-1 inline h-3 w-3" />
                  {total} KSN
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-fg-muted">
          <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <span>
            Illustrative only — no dividend has been paid and no transaction was made. The
            certificates and their attributes above are read from chain; the entitlement is
            arithmetic over the rate card, showing what an automated settlement agent could
            act on without ever seeing the underlying facility design.
          </span>
        </p>
      </div>
    </section>
  );
}
