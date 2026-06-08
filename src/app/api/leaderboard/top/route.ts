import { NextResponse, type NextRequest } from 'next/server';
import { listLeaderboardEntries } from '@/lib/leaderboard/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? '20');
  return NextResponse.json({
    entries: listLeaderboardEntries(Number.isFinite(limit) ? limit : 20),
  });
}
