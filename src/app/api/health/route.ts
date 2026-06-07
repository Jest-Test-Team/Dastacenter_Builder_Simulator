/**
 * GET /api/health
 * Liveness probe + build hash. Public; no PII.
 */

import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'datacenter-builder-simulator',
    version: process.env.NEXT_PUBLIC_VERSION ?? '0.1.0',
    time: new Date().toISOString(),
  });
}
