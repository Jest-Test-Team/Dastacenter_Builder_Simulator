/**
 * Proof generation endpoint.
 *
 * Accepts a witness the client derived locally and returns a proof carrying
 * only the public statement. The build itself is never sent here — the client
 * computes its own graph digest, which is the entire point of the design.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_THRESHOLD, ProofError, getProver } from '@/lib/zk';
import { ProveRequestSchema } from '@/lib/zk/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = ProveRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return NextResponse.json(
      { error: 'Invalid request', details: body.error.flatten() },
      { status: 400 },
    );

  try {
    const prover = getProver();
    const proof = await prover.prove({
      witness: body.data.witness,
      threshold: body.data.threshold ?? DEFAULT_THRESHOLD,
      rulePackVersion: body.data.rulePackVersion,
    });
    return NextResponse.json({ proof }, { status: 200 });
  } catch (err) {
    if (err instanceof ProofError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Proof generation failed' },
      { status: 502 },
    );
  }
}
