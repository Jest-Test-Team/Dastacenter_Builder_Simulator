/**
 * GET /api/auth/nonce
 * Issues a one-time nonce bound to the requester.
 */

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSession } from '@/lib/wallet/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NONCE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// In-memory store. For prod, swap to Upstash/Redis.
const usedNonces = new Map<string, number>();

function cleanup() {
  const now = Date.now();
  for (const [k, v] of usedNonces.entries()) {
    if (now - v > NONCE_TTL_MS) usedNonces.delete(k);
  }
}

export async function GET() {
  cleanup();
  const session = await getSession();
  const nonce = randomBytes(16).toString('hex');
  session.csrf = nonce;
  await session.save();
  return NextResponse.json({ nonce, issuedAt: Date.now(), ttl: NONCE_TTL_MS });
}

export { usedNonces };
