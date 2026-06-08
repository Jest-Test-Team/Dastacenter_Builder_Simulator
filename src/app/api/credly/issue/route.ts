/**
 * POST /api/credly/issue
 * Verifies a signed blueprint submission, recomputes the score server-side,
 * records a leaderboard row, and issues a Credly badge when the build clears
 * the threshold.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/wallet/session';
import { issueBadge, templateIdForLevel } from '@/lib/credly/server';
import { consumeNonce } from '@/app/api/auth/nonce-store';
import { verifySiweMessage } from '@/lib/wallet/siwe';
import { parseSiwsMessage, verifySiwsSignature } from '@/lib/wallet/siws';
import { validateBlueprintSubmission } from '@/lib/leaderboard/validation';
import { recordLeaderboardEntry } from '@/lib/leaderboard/server';
import type { BuildSnapshot } from '@/lib/store/build-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface IssueBody {
  buildId?: string;
  snapshot: BuildSnapshot;
  recipientEmail: string;
  recipientName?: string;
  blueprintHash: string;
  message: string;
  signature: string;
  walletKind?: 'evm' | 'solana';
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.address) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as IssueBody | null;
  if (
    !body ||
    !body.snapshot ||
    !body.recipientEmail ||
    !body.blueprintHash ||
    !body.message ||
    !body.signature
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.recipientEmail)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  if (!session.csrf) {
    return NextResponse.json({ error: 'Missing nonce' }, { status: 400 });
  }

  if (!consumeNonce(session.csrf)) {
    return NextResponse.json({ error: 'Nonce already used' }, { status: 400 });
  }
  session.csrf = undefined;
  await session.save();

  try {
    const verifiedAddress =
      body.walletKind === 'solana'
        ? verifySolanaIssue(body.message, body.signature, session.csrf)
        : await verifyEvmIssue(body.message, body.signature, session.csrf);

    if (verifiedAddress !== session.address) {
      return NextResponse.json({ error: 'Wallet address mismatch' }, { status: 401 });
    }

    const validated = await validateBlueprintSubmission(body.snapshot, body.blueprintHash);
    if ('ok' in validated && !validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: validated.status });
    }

    const { report, buildId, scenarioId, scenarioName } = validated;
    if (report.competitionScore < 85) {
      return NextResponse.json(
        {
          error: 'Blueprint verification failed',
          score: report.competitionScore,
          threshold: 85,
        },
        { status: 400 },
      );
    }

    const leaderboardRow = recordLeaderboardEntry({
      buildId,
      walletAddress: verifiedAddress,
      blueprintHash: body.blueprintHash,
      competitionScore: report.competitionScore,
      score: report.score,
      tier: report.tier,
      level: report.level,
      pue: report.pue,
      buildCostUsd: report.buildCostUsd,
      budgetUsd: report.budgetUsd,
      overBudget: report.overBudget,
      scenarioId,
      scenarioName,
    });

    const templateId = templateIdForLevel(report.level as 'Bronze' | 'Silver' | 'Gold' | 'Platinum');
    if (!templateId) {
      return NextResponse.json(
        { error: `No Credly template configured for level ${report.level}` },
        { status: 500 },
      );
    }

    const badge = await issueBadge({
      badgeTemplateId: templateId,
      recipientEmail: body.recipientEmail,
      recipientName: body.recipientName,
      evidence: [
        {
          type: 'KeyValueGroupEvidence',
          name: 'Build Details',
          values: [
            { label: 'Score', value: String(report.score) },
            { label: 'Competition Score', value: String(report.competitionScore) },
            { label: 'Uptime Tier', value: report.tier },
            { label: 'Cert Level', value: report.level },
            { label: 'PUE', value: String(report.pue) },
            { label: 'WUE', value: String(report.wue) },
            { label: 'Build Cost', value: String(report.buildCostUsd) },
            { label: 'Budget', value: String(report.budgetUsd) },
            { label: 'Blueprint Hash', value: body.blueprintHash },
            { label: 'Build ID', value: body.buildId ?? buildId },
            { label: 'Scenario', value: scenarioName },
          ],
        },
        {
          type: 'UrlEvidence',
          name: 'Verify',
          value: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/cert/${body.buildId ?? buildId}`,
        },
      ],
    });

    recordLeaderboardEntry({
      ...leaderboardRow,
      issuedBadgeId: badge.id,
      issuedBadgeUrl: badge.public_url,
    });

    return NextResponse.json({
      ok: true,
      badgeId: badge.id,
      publicUrl: badge.public_url,
      competitionScore: report.competitionScore,
      leaderboard: leaderboardRow,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Credly issue failed' },
      { status: 502 },
    );
  }
}

async function verifyEvmIssue(message: string, signature: string, expectedNonce: string) {
  const result = await verifySiweMessage(message, signature);
  if (result.nonce !== expectedNonce) {
    throw new Error('Nonce mismatch');
  }
  return result.address;
}

function verifySolanaIssue(message: string, signature: string, expectedNonce: string) {
  if (!verifySiwsSignature(message, signature)) {
    throw new Error('Bad signature');
  }
  const fields = parseSiwsMessage(message);
  if (!fields) {
    throw new Error('Invalid SIWS message');
  }
  if (fields.nonce !== expectedNonce) {
    throw new Error('Nonce mismatch');
  }
  return fields.address;
}
