/**
 * Wallet-gated preview of the SBT certificates owned by the connected wallet.
 *
 * Reads directly from the deployed contracts on every chain that has an SBT
 * contract configured (Polygon Amoy + Ethereum Sepolia), lists the user's
 * token IDs, and renders the stored metadata image + attributes for each.
 */

'use client';

import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Loader2, ExternalLink, ImageOff, Wallet } from 'lucide-react';
import { WalletPicker } from '@/components/wallet/WalletPicker';
import {
  getUserCertificates,
  getCertificateInfo,
  getSBTContractAddress,
  type CertificateInfo,
} from '@/lib/sbt/client';
import { getChainConfig, getExplorerUrl } from '@/lib/sbt/chains';
import { PlanetaryDividend } from '@/components/cert/PlanetaryDividend';

// Chains the SBT contract is deployed on.
const AMOY = 80002;
const SEPOLIA = 11155111;

type OwnedCert = CertificateInfo & { chainId: number };

export function MyOnChainCertificates() {
  const { address, isConnected } = useAccount();
  // Force public clients on the chains the contracts live on, regardless of
  // which network the wallet is currently switched to.
  const amoyClient = usePublicClient({ chainId: AMOY });
  const sepoliaClient = usePublicClient({ chainId: SEPOLIA });

  const [loading, setLoading] = useState(false);
  const [certs, setCerts] = useState<OwnedCert[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setCerts([]);
      return;
    }

    const targets = [
      { chainId: AMOY, client: amoyClient },
      { chainId: SEPOLIA, client: sepoliaClient },
    ].filter((t) => t.client && getSBTContractAddress(t.chainId));

    if (targets.length === 0) {
      setError('No SBT contract address is configured.');
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const all: OwnedCert[] = [];
        for (const { chainId, client } of targets) {
          const tokenIds = await getUserCertificates(address, chainId, client!);
          const infos = await Promise.all(
            tokenIds.map((id) => getCertificateInfo(id, chainId, client!)),
          );
          for (const info of infos) if (info) all.push({ ...info, chainId });
        }
        if (!cancelled) setCerts(all);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load certificates');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected, amoyClient, sepoliaClient]);

  if (!isConnected) {
    return (
      <div className="panel p-6 text-center">
        <Wallet className="mx-auto h-10 w-10 text-fg-muted/40" />
        <p className="mt-3 text-fg-muted">Connect your wallet to preview the NFT certificates you own.</p>
        <div className="mt-4 flex justify-center">
          <WalletPicker />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="panel p-8 text-center text-fg-muted">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        <p className="mt-2">Reading your certificates from the blockchain…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel p-6 text-center">
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (certs.length === 0) {
    return (
      <div className="panel p-6 text-center">
        <ImageOff className="mx-auto h-10 w-10 text-fg-muted/40" />
        <p className="mt-3 text-fg-muted">No SBT certificates found for this wallet on Polygon Amoy or Sepolia.</p>
        <p className="mt-1 text-xs text-fg-muted">
          Mint one from your result page after passing the certification threshold.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        {certs.map((cert) => (
          <CertCard key={`${cert.chainId}-${cert.tokenId.toString()}`} cert={cert} />
        ))}
      </div>
      <PlanetaryDividend certs={certs} />
    </>
  );
}

function CertCard({ cert }: { cert: OwnedCert }) {
  const md = cert.metadata;
  const image = md?.image;
  const attrs = md?.attributes ?? [];
  const chainName = getChainConfig(cert.chainId)?.name ?? `Chain ${cert.chainId}`;

  return (
    <div className="panel overflow-hidden">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={md?.name ?? `Certificate #${cert.tokenId}`} className="w-full border-b border-border" />
      ) : (
        <div className="flex h-40 items-center justify-center border-b border-border bg-bg-subtle text-fg-muted">
          <ImageOff className="h-8 w-8" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{md?.name ?? 'Datacenter Certificate'}</h3>
          <span className="badge text-xs">#{cert.tokenId.toString()}</span>
        </div>
        <p className="mt-1 text-xs text-fg-muted">{chainName}</p>

        {attrs.length > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {attrs.slice(0, 6).map((a, i) => (
              <div key={i} className="flex justify-between">
                <dt className="text-fg-muted">{a.trait_type}</dt>
                <dd className="truncate font-mono font-semibold" title={String(a.value)}>
                  {String(a.value)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <p className="mt-3 break-all font-mono text-[10px] text-fg-muted">Owner: {cert.owner}</p>
        <a
          href={getExplorerUrl(cert.chainId, cert.owner, 'address')}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          View on explorer
        </a>
      </div>
    </div>
  );
}
