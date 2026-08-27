/**
 * The right-hand half of the dashboard's split screen.
 *
 * Entitlement above, the agent's live terminal below, and a dividend receipt
 * over the whole page when a real transfer confirms. This component owns the one
 * piece of state that connects them — the terminal streams events, and the
 * `settled` / `blocked` outcome flows back up into the entitlement panel so the
 * two halves can never disagree about whether anything was paid.
 */

'use client';

import { useCallback, useState } from 'react';
import type { CertificateInfo } from '@/lib/sbt/client';
import type { AgentEvent } from '@/lib/agent/types';
import { PlanetaryDividend } from '@/components/cert/PlanetaryDividend';
import { AgentTerminal } from './AgentTerminal';
import { DividendToast } from './DividendToast';

type OwnedCert = CertificateInfo & { chainId: number };
type Settled = Extract<AgentEvent, { stage: 'settled' }>;
type Blocked = Extract<AgentEvent, { stage: 'blocked' }>;

export function SettlementPanel({
  certs,
  address,
  chainId,
}: {
  certs: OwnedCert[];
  address: string | undefined;
  chainId: number;
}) {
  const [settled, setSettled] = useState<Settled | null>(null);
  const [blocked, setBlocked] = useState<Blocked | null>(null);

  const onEvent = useCallback((event: AgentEvent) => {
    // A new run clears the previous verdict, so a stale receipt can never sit
    // above a run that has since failed.
    if (event.stage === 'watch' && event.attempt === 1) {
      setSettled(null);
      setBlocked(null);
    }
    if (event.stage === 'settled') setSettled(event);
    if (event.stage === 'blocked') setBlocked(event);
  }, []);

  return (
    <div className="space-y-4">
      <PlanetaryDividend certs={certs} settled={settled} blocked={blocked} />
      <AgentTerminal address={address} chainId={chainId} onEvent={onEvent} />
      <DividendToast settled={settled} />
    </div>
  );
}
