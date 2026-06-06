/**
 * GET /api/auth/nonce
 * Issues a one-time nonce bound to the requester.
 */

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSession } from '@/lib/wallet/session';
import { cleanupNonces, recordNonce, NONCE_TTL_MS } from '../nonce-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  cleanupNonces();
  const session = await getSession();
  const nonce = randomBytes(16).toString('hex');
  session.csrf = nonce;
  recordNonce(nonce);
  await session.save();
  return NextResponse.json({ nonce, issuedAt: Date.now(), ttl: NONCE_TTL_MS });
}
