/**
 * Certificate verification page.
 *
 * Scanned from the QR code on a certificate. Accepts ?id=<buildId>
 * and shows the cert details + score. Also handles share URLs.
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loadBuildFromIDB } from '@/lib/persist';
import { decodeShareToken } from '@/lib/persist/share';
import { score, type RatingReport } from '@/lib/scoring';
import { CertificateSvg } from '@/components/cert/CertificateSvg';
import { MyOnChainCertificates } from '@/components/cert/MyOnChainCertificates';
import { WalletPicker } from '@/components/wallet/WalletPicker';
import { useT } from '@/lib/i18n/client';
import { Shield, CheckCircle, XCircle, ExternalLink, Search, Wallet } from 'lucide-react';

type VerifyState =
  | { status: 'loading' }
  | { status: 'valid'; report: RatingReport; buildId: string; name: string }
  | { status: 'invalid'; message: string }
  | { status: 'empty' };

export default function VerifyPage() {
  const search = useSearchParams();
  const t = useT();
  const [state, setState] = useState<VerifyState>({ status: 'loading' });
  const [inputId, setInputId] = useState('');

  useEffect(() => {
    const id = search?.get('id') ?? search?.get('buildId') ?? '';
    if (!id) {
      setState({ status: 'empty' });
      return;
    }
    setInputId(id);
    void verifyId(id);
  }, [search]);

  async function verifyId(id: string) {
    setState({ status: 'loading' });

    // Try as a direct build ID first
    const record = await loadBuildFromIDB(id);
    if (record) {
      const report = score(record.snapshot);
      setState({
        status: 'valid',
        report,
        buildId: record.id,
        name: record.name,
      });
      return;
    }

    // Try as a share token
    try {
      const snap = await decodeShareToken(id);
      if (snap) {
        const report = score(snap);
        setState({
          status: 'valid',
          report,
          buildId: snap.buildId,
          name: snap.name,
        });
        return;
      }
    } catch {
      // not a share token
    }

    // Try as cert ID format: DCB-XXXXXX-XXXX
    const certMatch = id.toUpperCase().match(/^DCB-([A-Z0-9]{6})-/);
    if (certMatch && certMatch[1]) {
      // Search IndexedDB for a build whose ID starts with this prefix
      const { listBuildsFromIDB } = await import('@/lib/persist');
      const builds = await listBuildsFromIDB();
      const prefix = certMatch[1];
      const match = builds.find((b) => b.id.toUpperCase().startsWith(prefix));
      if (match) {
        const report = score(match.snapshot);
        setState({
          status: 'valid',
          report,
          buildId: match.id,
          name: match.name,
        });
        return;
      }
    }

    setState({
      status: 'invalid',
      message: `No certificate found for "${id}". The build may have been deleted or the ID is incorrect.`,
    });
  }

  function handleManualVerify(e: React.FormEvent) {
    e.preventDefault();
    if (inputId.trim()) {
      void verifyId(inputId.trim());
    }
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
            <span className="text-2xl">🖥️</span>
            <span>Datacenter Builder</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <WalletPicker />
            <Link href="/" className="btn-ghost text-sm">
              Home
            </Link>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Shield className="h-6 w-6 text-primary" />
          {t('verifier.title')}
        </h1>
        <p className="mt-1 text-fg-muted">{t('verifier.intro')}</p>

        {/* Wallet-gated preview of the user's on-chain SBT certificates */}
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Wallet className="h-5 w-5 text-primary" />
            Your NFT certificates
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Connect your wallet to preview the Soulbound certificates you own on-chain.
          </p>
          <div className="mt-4">
            <MyOnChainCertificates />
          </div>
        </section>

        <div className="my-10 border-t border-border" />

        <h2 className="text-lg font-semibold">Verify by certificate ID</h2>

        {/* Manual input form */}
        <form onSubmit={handleManualVerify} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              className="input pl-9"
              placeholder={t('verifier.input.placeholder')}
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
            />
          </div>
          <button type="submit" className="btn" disabled={!inputId.trim()}>
            {t('verifier.verify')}
          </button>
        </form>

        {/* Result */}
        <div className="mt-8">
          {state.status === 'loading' && (
            <div className="panel p-8 text-center text-fg-muted">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-2">{t('verifier.verifying')}</p>
            </div>
          )}

          {state.status === 'empty' && (
            <div className="panel p-8 text-center">
              <Shield className="mx-auto h-12 w-12 text-fg-muted/40" />
              <p className="mt-3 text-fg-muted">{t('verifier.empty')}</p>
              <p className="mt-1 text-xs text-fg-muted">
                Scan a QR code on a certificate or enter a build ID above.
              </p>
            </div>
          )}

          {state.status === 'invalid' && (
            <div className="panel p-8 text-center">
              <XCircle className="mx-auto h-12 w-12 text-danger" />
              <p className="mt-3 font-semibold text-danger">{t('verifier.invalid')}</p>
              <p className="mt-1 text-sm text-fg-muted">{state.message}</p>
            </div>
          )}

          {state.status === 'valid' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 p-4">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-semibold text-success">{t('verifier.valid')}</p>
                  <p className="text-xs text-fg-muted">
                    Build: {state.name} · ID: {state.buildId.slice(0, 12)}…
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="panel p-5">
                  <h2 className="text-sm font-semibold">Certificate Details</h2>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-fg-muted">Score</dt>
                      <dd className="font-mono font-semibold">{state.report.score}/100</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-fg-muted">Uptime Tier</dt>
                      <dd className="font-mono font-semibold">{state.report.tier}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-fg-muted">Certificate Level</dt>
                      <dd className="font-mono font-semibold">{state.report.level}</dd>
                    </div>
                    {state.report.pue && (
                      <div className="flex justify-between">
                        <dt className="text-fg-muted">PUE</dt>
                        <dd className="font-mono font-semibold">{state.report.pue}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-fg-muted">Certifiable</dt>
                      <dd className={state.report.certifiable ? 'text-success' : 'text-warn'}>
                        {state.report.certifiable ? 'Yes' : 'No'}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/cert/${state.buildId}`} className="btn-ghost text-xs">
                      <ExternalLink className="h-3.5 w-3.5" />
                      View certificate
                    </Link>
                    <Link href={`/result/${state.buildId}`} className="btn-ghost text-xs">
                      View results
                    </Link>
                  </div>
                </div>

                <div>
                  <CertificateSvg
                    report={state.report}
                    recipientName="Verified Builder"
                    buildId={state.buildId}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
