/**
 * GET /api/auth/session
 * Returns the current session.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/wallet/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session.address) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    address: session.address,
    walletKind: session.walletKind,
    issuedAt: session.issuedAt,
  });
}
