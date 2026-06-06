/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/wallet/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}
