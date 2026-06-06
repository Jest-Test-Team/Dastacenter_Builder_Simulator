/**
 * POST /api/credly/issue
 * Issues a Credly badge for a given build.
 *
 * Auth: requires a valid session.
 * Body: { buildId, recipientEmail, recipientName? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/wallet/session';
import { issueBadge, templateIdForLevel } from '@/lib/credly/server';
import { loadBuildFromIDB } from '@/lib/persist';
import { score } from '@/lib/scoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface IssueBody {
  buildId: string;
  recipientEmail: string;
  recipientName?: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.address) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as IssueBody | null;
  if (!body || !body.buildId || !body.recipientEmail) {
    return NextResponse.json({ error: 'Missing buildId or recipientEmail' }, { status: 400 });
  }

  // Validate email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.recipientEmail)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  // Load build
  const record = await loadBuildFromIDB(body.buildId);
  if (!record) {
    return NextResponse.json({ error: 'Build not found' }, { status: 404 });
  }

  // Verify ownership (the build's wallet owner is stored in the snapshot,
  // but for v1 we trust the IndexedDB layer on the user's device).
  // In a real deployment with cloud save, this would compare session.address
  // against the build's wallet owner.

  // Score
  const report = score(record.snapshot);
  if (!report.certifiable) {
    return NextResponse.json(
      { error: 'Build does not meet the certificate threshold.', score: report.score, tier: report.tier },
      { status: 400 },
    );
  }

  const templateId = templateIdForLevel(report.level as 'Bronze' | 'Silver' | 'Gold' | 'Platinum');
  if (!templateId) {
    return NextResponse.json(
      { error: `No Credly template configured for level ${report.level}` },
      { status: 500 },
    );
  }

  try {
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
            { label: 'Uptime Tier', value: report.tier },
            { label: 'Cert Level', value: report.level },
            { label: 'PUE', value: String(report.pue) },
            { label: 'WUE', value: String(report.wue) },
            { label: 'Build ID', value: body.buildId },
            { label: 'Scenario', value: record.scenarioName },
          ],
        },
        {
          type: 'UrlEvidence',
          name: 'Verify',
          value: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/cert/${body.buildId}`,
        },
      ],
    });
    return NextResponse.json({ ok: true, badgeId: badge.id, publicUrl: badge.public_url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Credly issue failed' },
      { status: 502 },
    );
  }
}
