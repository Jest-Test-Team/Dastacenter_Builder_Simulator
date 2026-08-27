/**
 * Loads the SBT certificates the connected wallet owns.
 *
 * Reads directly from the deployed contracts on every chain that has one
 * configured (Polygon Amoy + Ethereum Sepolia), regardless of which network the
 * wallet is switched to. Shared by the /verify preview and the /dashboard
 * finale so both show the same certificates from one source of truth.
 */

'use client';

import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import {
  getUserCertificates,
  getCertificateInfo,
  getSBTContractAddress,
  type CertificateInfo,
} from '@/lib/sbt/client';

// Chains the SBT contract is deployed on.
export const AMOY = 80002;
export const SEPOLIA = 11155111;
/**
 * A local Hardhat node. Only ever scanned when someone has actually deployed to
 * one and set `NEXT_PUBLIC_SBT_CONTRACT_ADDRESS_LOCALHOST` — `getSBTContractAddress`
 * returns null otherwise, so the target is filtered out and production never
 * dials localhost.
 */
export const LOCALHOST = 31337;

export type OwnedCert = CertificateInfo & { chainId: number };

export interface OwnedCertificatesState {
  certs: OwnedCert[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  address?: `0x${string}`;
}

export function useOwnedCertificates(): OwnedCertificatesState {
  const { address, isConnected } = useAccount();
  const amoyClient = usePublicClient({ chainId: AMOY });
  const sepoliaClient = usePublicClient({ chainId: SEPOLIA });
  const localClient = usePublicClient({ chainId: LOCALHOST });

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
      { chainId: LOCALHOST, client: localClient },
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
  }, [address, isConnected, amoyClient, sepoliaClient, localClient]);

  return { certs, loading, error, isConnected, address };
}
