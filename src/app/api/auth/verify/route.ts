/**
 * POST /api/auth/verify
 * Verifies a SIWE or SIWS message + signature and issues a session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/wallet/session';
import { verifySiweMessage } from '@/lib/wallet/siwe';
import { verifySiwsSignature, parseSiwsMessage } from '@/lib/wallet/siws';
import { consumeNonce, recordNonce } from '../nonce-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface VerifyBody {
  message: string;
  signature: string;
  kind: 'evm' | 'solana';
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as VerifyBody | null;
  if (!body || !body.message || !body.signature || !body.kind) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const session = await getSession();
  const expectedNonce = session.csrf;
  if (!expectedNonce) {
    return NextResponse.json({ error: 'No nonce in session' }, { status: 400 });
  }

  if (usedNonces.has(expectedNonce)) {
    return NextResponse.json({ error: 'Nonce already used' }, { status: 400 });
  }
  usedNonces.set(expectedNonce, Date.now());

  try {
    let address: string;
    if (body.kind === 'evm') {
      const result = await verifySiweMessage(body.message, body.signature);
      if (result.nonce !== expectedNonce) {
        return NextResponse.json({ error: 'Nonce mismatch' }, { status: 400 });
      }
      address = result.address;
    } else {
      const ok = verifySiwsSignature(body.message, body.signature);
      if (!ok) return NextResponse.json({ error: 'Bad signature' }, { status: 401 });
      const fields = parseSiwsMessage(body.message);
      if (!fields || fields.nonce !== expectedNonce) {
        return NextResponse.json({ error: 'Nonce mismatch' }, { status: 400 });
      }
      address = fields.address;
    }

    session.address = address;
    session.walletKind = body.kind;
    session.issuedAt = Date.now();
    session.csrf = undefined;
    await session.save();

    return NextResponse.json({ ok: true, address });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Verification failed' },
      { status: 401 },
    );
  }
}
