/**
 * POST /api/vitals
 * Receives Web Vitals beacons. We don't store PII; just aggregate.
 *
 * In production, forward to PostHog (if consent) and/or our
 * metrics endpoint. For now, just count.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    if (!body || body.length > 1024) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    // TODO: forward to PostHog / DataDog. For now, accept and drop.
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
