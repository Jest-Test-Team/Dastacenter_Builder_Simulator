/**
 * KSN Planetary Dividend — entitlement, and its settlement status.
 *
 * This panel used to walk four hard-coded strings on a 900 ms timer and carry a
 * blanket "Projection" badge, because nothing behind it was real. Both halves of
 * that have changed: the agent in `src/lib/agent/settle.ts` genuinely reads the
 * chain, verifies the credential and transfers a real ERC-20, and this panel now
 * reports what actually happened rather than animating what might.
 *
 * The rule that survives unchanged is the important one. A token figure shown
 * beside a wallet the viewer owns reads as *money I have been paid*, so this
 * component must never imply a payment that did not occur. It therefore states
 * its status explicitly in all three cases — not settled, blocked, settled with
 * a transaction hash — and a test asserts each, because "the disclaimer" is no
 * longer one fixed sentence that could simply be checked for.
 */

'use client';

import { Bot, Coins, Info, ExternalLink } from 'lucide-react';
import type { CertificateInfo } from '@/lib/sbt/client';
import { RATE_BY_LEVEL, DEFAULT_RATE } from '@/lib/agent/rate-card';
import type { AgentEvent } from '@/lib/agent/types';
import { useT } from '@/lib/i18n/client';

type OwnedCert = CertificateInfo & { chainId: number };

function levelOf(cert: OwnedCert): string {
  const attributes = cert.metadata?.attributes ?? [];
  const match = attributes.find(
    (attribute) =>
      attribute.trait_type === 'Level' || attribute.trait_type === 'Certification Level',
  );
  return match ? String(match.value) : 'Bronze';
}

export function PlanetaryDividend({
  certs,
  settled = null,
  blocked = null,
}: {
  certs: OwnedCert[];
  settled?: Extract<AgentEvent, { stage: 'settled' }> | null;
  blocked?: Extract<AgentEvent, { stage: 'blocked' }> | null;
}) {
  const t = useT();
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
    <section className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Bot className="h-4 w-4 text-accent" />
        <h3 className="font-semibold">{t('dividend.title')}</h3>
        {settled ? (
          <span className="badge ml-auto border-success/40 bg-success/10 text-[10px] uppercase tracking-wider text-success">
            {t('dividend.badge.settled')}
          </span>
        ) : (
          <span className="badge ml-auto border-warn/40 bg-warn/10 text-[10px] uppercase tracking-wider text-warn">
            {t('dividend.badge.notSettled')}
          </span>
        )}
      </div>

      <div className="px-5 py-4">
        <div className="rounded border border-border bg-bg-subtle p-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-fg-muted">
                <th className="pb-1 text-left font-normal">{t('dividend.col.certificate')}</th>
                <th className="pb-1 text-left font-normal">{t('dividend.col.level')}</th>
                <th className="pb-1 text-right font-normal">{t('dividend.col.rate')}</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {lines.map((line) => (
                <tr key={line.key}>
                  <td className="py-0.5">#{line.tokenId}</td>
                  <td className="py-0.5">{line.level}</td>
                  <td className="py-0.5 text-right">{line.rate.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-mono font-semibold">
                <td className="pt-1.5" colSpan={2}>
                  {t('dividend.entitlement')}
                </td>
                <td className="pt-1.5 text-right text-success">
                  <Coins className="mr-1 inline h-3 w-3" />
                  {total.toLocaleString()} KSN
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {settled ? (
          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-fg-muted">
            <Info className="mt-0.5 h-3 w-3 flex-shrink-0 text-success" />
            <span>
              {t('dividend.status.settled', { amount: settled.amount.toLocaleString() })}{' '}
              {settled.explorerUrl.startsWith('http') ? (
                <a
                  href={settled.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-primary underline"
                >
                  {settled.txHash.slice(0, 14)}…
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              ) : (
                <span className="font-mono">{settled.txHash.slice(0, 14)}…</span>
              )}
            </span>
          </p>
        ) : blocked ? (
          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-warn">
            <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <span>{t('dividend.status.blocked', { stage: blocked.at, reason: blocked.reason })}</span>
          </p>
        ) : (
          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-fg-muted">
            <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <span>{t('dividend.status.pending')}</span>
          </p>
        )}
      </div>
    </section>
  );
}
