/**
 * Certificate page.
 *
 * Shows the cert (SVG-rendered), lets the user download it (PNG/SVG),
 * and offers to publish to Credly via /api/credly/issue.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLoadBuild } from '@/lib/persist';
import { loadBuildFromIDB } from '@/lib/persist';
import { useBuildStore } from '@/lib/store/build-store';
import { score, type RatingReport } from '@/lib/scoring';
import { Award, Download, ExternalLink, CheckCircle2 } from 'lucide-react';
import { CertificateSvg } from '@/components/cert/CertificateSvg';

export default function CertPage() {
  const params = useParams<{ buildId: string }>();
  const buildId = params?.buildId;
  useLoadBuild(buildId ?? null);
  const [report, setReport] = useState<RatingReport | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<{ id: string; url?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!buildId) return;
    void (async () => {
      const rec = await loadBuildFromIDB(buildId);
      if (rec) {
        useBuildStore.getState().loadBuild(rec.snapshot);
        setReport(score(rec.snapshot));
      }
    })();
  }, [buildId]);

  if (!report) {
    return (
      <div className="flex h-screen items-center justify-center text-fg-muted">
        Loading certificate…
      </div>
    );
  }

  if (!report.certifiable) {
    return (
      <div className="flex h-screen items-center justify-center">
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

  async function handleIssue() {
    if (!buildId) return;
    setIssuing(true);
    setError(null);
    try {
      const res = await fetch('/api/credly/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildId, recipientEmail, recipientName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Issue failed');
      setIssued({ id: data.badgeId, url: data.publicUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Issue failed');
    } finally {
      setIssuing(false);
    }
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-2xl">🖥️</span>
            <span>Datacenter Builder</span>
          </Link>
          <Link href={`/result/${buildId}`} className="btn-ghost text-sm">
            Back to results
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Award className="h-6 w-6 text-warn" />
          Your certificate
        </h1>
        <p className="mt-1 text-fg-muted">
          Share it, download it, or publish to Credly. The QR code lets anyone verify.
        </p>

        <div className="mt-6">
          <CertificateSvg
            report={report}
            recipientName={recipientName || 'Anonymous Builder'}
            recipientWallet={useBuildStore.getState().policies ? '' : ''}
            buildId={buildId ?? ''}
          />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="panel p-5">
            <h2 className="font-semibold">Download</h2>
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
            <h2 className="font-semibold">Publish to Credly</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Receive the badge in your email. Free, opt-in.
            </p>
            {issued ? (
              <div className="mt-4 rounded border border-success/30 bg-success/10 p-3 text-sm">
                <p className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" /> Badge issued
                </p>
                <p className="mt-1 text-xs text-fg-muted">
                  Check {recipientEmail} for the acceptance email from Credly.
                </p>
                {issued.url && (
                  <a
                    href={issued.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View on Credly
                  </a>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <input
                  className="input"
                  placeholder="Your name (optional)"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  required
                />
                {error && <p className="text-xs text-danger">{error}</p>}
                <button
                  onClick={handleIssue}
                  disabled={issuing || !recipientEmail}
                  className="btn w-full"
                >
                  {issuing ? 'Issuing…' : 'Issue to my email'}
                </button>
                <p className="text-[10px] text-fg-muted">
                  By issuing you accept the{' '}
                  <Link href="/legal/privacy" className="underline">
                    privacy policy
                  </Link>
                  . Your email is sent to Credly only.
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
