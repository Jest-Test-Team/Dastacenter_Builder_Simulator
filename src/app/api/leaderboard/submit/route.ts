import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/wallet/session';
import { consumeNonce } from '@/app/api/auth/nonce-store';
import { verifySiweMessage } from '@/lib/wallet/siwe';
import { parseSiwsMessage, verifySiwsSignature } from '@/lib/wallet/siws';
import { validateBlueprintSubmission } from '@/lib/leaderboard/validation';
import { recordLeaderboardEntry } from '@/lib/leaderboard/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SubmitBody {
  buildId: string;
  blueprintHash: string;
  message: string;
  signature: string;
  walletKind?: 'evm' | 'solana';
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.address) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as SubmitBody | null;
  if (!body?.buildId || !body.blueprintHash || !body.message || !body.signature) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!session.csrf) return NextResponse.json({ error: 'Missing nonce' }, { status: 400 });
  if (!consumeNonce(session.csrf)) {
    return NextResponse.json({ error: 'Nonce already used' }, { status: 400 });
  }
  session.csrf = undefined;
  await session.save();

  try {
    const verifiedAddress =
      body.walletKind === 'solana'
        ? verifySolana(body.message, body.signature, session.csrf)
        : await verifyEvm(body.message, body.signature, session.csrf);

    if (verifiedAddress !== session.address) {
      return NextResponse.json({ error: 'Wallet address mismatch' }, { status: 401 });
    }

    const validated = await validateBlueprintSubmission(body.buildId, body.blueprintHash);
    if ('ok' in validated && !validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: validated.status });
    }

    const row = recordLeaderboardEntry({
      buildId: validated.buildId,
      walletAddress: verifiedAddress,
      blueprintHash: validated.blueprintHash,
      competitionScore: validated.report.competitionScore,
      score: validated.report.score,
      tier: validated.report.tier,
      level: validated.report.level,
      pue: validated.report.pue,
      buildCostUsd: validated.report.buildCostUsd,
      budgetUsd: validated.report.budgetUsd,
      overBudget: validated.report.overBudget,
      scenarioId: validated.scenarioId,
      scenarioName: validated.scenarioName,
    });

    return NextResponse.json({ ok: true, entry: row });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Leaderboard submit failed' },
      { status: 502 },
    );
  }
}

async function verifyEvm(message: string, signature: string, expectedNonce: string) {
  const result = await verifySiweMessage(message, signature);
  if (result.nonce !== expectedNonce) throw new Error('Nonce mismatch');
  return result.address;
}

function verifySolana(message: string, signature: string, expectedNonce: string) {
  if (!verifySiwsSignature(message, signature)) throw new Error('Bad signature');
  const fields = parseSiwsMessage(message);
  if (!fields) throw new Error('Invalid SIWS message');
  if (fields.nonce !== expectedNonce) throw new Error('Nonce mismatch');
  return fields.address;
}
