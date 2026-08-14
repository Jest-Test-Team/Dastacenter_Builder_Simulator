/**
 * Dashboard — the closing beat of the demo.
 *
 * After a successful mint the user lands here. Left: "My Certificates", the
 * on-chain SBTs this wallet owns, with the top-level "Elite Green Architect SBT"
 * called out. Right: the KSN settlement agent detecting the credential and
 * computing a Planetary Dividend from it. It closes on a KSN × Midnight lockup.
 *
 * Everything on this page is read from chain and reuses the same components as
 * /verify — the certificates and their attributes are real; the dividend is a
 * clearly-labelled projection, never a payment.
 */

'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Award, ArrowLeft, CheckCircle2, ImageOff, Loader2, Wallet } from 'lucide-react';
import { WalletPicker } from '@/components/wallet/WalletPicker';
import { CertCard } from '@/components/cert/MyOnChainCertificates';
import { PlanetaryDividend } from '@/components/cert/PlanetaryDividend';
import { useOwnedCertificates, type OwnedCert } from '@/lib/sbt/use-owned-certificates';

const ELITE_NAME = 'Elite Green Architect SBT';

function isElite(cert: OwnedCert): boolean {
  return (cert.metadata?.name ?? '').includes('Elite Green Architect');
}

export default function DashboardPage() {
  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-bg">
      <Header />
      <Suspense fallback={<div className="py-20 text-center text-fg-muted">Loading…</div>}>
        <DashboardBody />
      </Suspense>
      <BrandLockup />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-border bg-bg-panel/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <span className="text-2xl">🖥️</span>
          <span>Datacenter Builder</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <WalletPicker />
          <Link href="/verify" className="btn-ghost text-sm">
            Verify a certificate
          </Link>
        </div>
      </div>
    </header>
  );
}

function DashboardBody() {
  const search = useSearchParams();
  const justMinted = search?.get('minted') === '1';
  const { certs, loading, error, isConnected } = useOwnedCertificates();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {justMinted && (
        <div className="mb-8 flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 p-5">
          <CheckCircle2 className="h-7 w-7 flex-shrink-0 text-success" />
          <div>
            <h1 className="text-2xl font-bold text-success">Mint Successful!</h1>
            <p className="text-sm text-fg-muted">
              Your Soulbound certificate is now on-chain and visible below.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Award className="h-5 w-5 text-warn" />
          My Certificates
        </h2>
        <Link href="/build" className="btn-ghost text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to builder
        </Link>
      </div>

      {!isConnected ? (
        <div className="panel p-8 text-center">
          <Wallet className="mx-auto h-10 w-10 text-fg-muted/40" />
          <p className="mt-3 text-fg-muted">
            Connect your wallet to see the certificates it holds and the KSN dividend they unlock.
          </p>
          <div className="mt-4 flex justify-center">
            <WalletPicker />
          </div>
        </div>
      ) : loading ? (
        <div className="panel p-10 text-center text-fg-muted">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          <p className="mt-2">Reading your certificates from the blockchain…</p>
        </div>
      ) : error ? (
        <div className="panel p-6 text-center text-sm text-danger">{error}</div>
      ) : certs.length === 0 ? (
        <div className="panel p-8 text-center">
          <ImageOff className="mx-auto h-10 w-10 text-fg-muted/40" />
          <p className="mt-3 text-fg-muted">
            No SBT certificates found for this wallet on Polygon Amoy or Sepolia.
          </p>
          <Link href="/build" className="btn mt-4">
            Build one
          </Link>
        </div>
      ) : (
        // The split screen: certificates on the left, the KSN agent on the right.
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {[...certs].sort((a, b) => Number(isElite(b)) - Number(isElite(a))).map((cert) => (
              <div
                key={`${cert.chainId}-${cert.tokenId.toString()}`}
                className={
                  isElite(cert)
                    ? 'rounded-lg p-[2px] shadow-[0_0_40px_-8px] shadow-emerald-500/50 ring-2 ring-emerald-400/60 [background:linear-gradient(135deg,rgba(16,185,129,0.25),transparent)]'
                    : ''
                }
              >
                {isElite(cert) && (
                  <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                    <Award className="h-3.5 w-3.5" />
                    {ELITE_NAME}
                  </div>
                )}
                <CertCard cert={cert} />
              </div>
            ))}
          </div>
          <div className="lg:sticky lg:top-6 lg:self-start">
            <PlanetaryDividend certs={certs} />
          </div>
        </div>
      )}
    </main>
  );
}

/** Closing KSN × Midnight lockup on black — the last frame of the sequence. */
function BrandLockup() {
  return (
    <footer className="mt-12 bg-black py-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-center">
        <div className="flex items-center gap-5 sm:gap-8">
          <span className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
            KSN
          </span>
          <span className="text-lg text-white/30">×</span>
          <span className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <span className="inline-block h-5 w-5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 sm:h-6 sm:w-6" />
            Midnight
          </span>
        </div>
        <p className="max-w-xl text-sm text-white/50">
          Verifiable green compute, settled by autonomous agents — proven without leaking the
          design behind it.
        </p>
      </div>
    </footer>
  );
}
