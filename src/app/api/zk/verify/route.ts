/**
 * Proof verification endpoint.
 *
 * Anyone can call this with a proof and learn one bit: whether a design behind
 * the commitment cleared the threshold under the named rule pack.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { CIRCUIT_ID, ProofError, getProver } from '@/lib/zk';
import { VerifyRequestSchema } from '@/lib/zk/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = VerifyRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return NextResponse.json(
      { error: 'Invalid request', details: body.error.flatten() },
      { status: 400 },
    );

  if (body.data.proof.statement.circuit !== CIRCUIT_ID)
    return NextResponse.json(
      { valid: false, reason: `Unknown circuit ${body.data.proof.statement.circuit}` },
      { status: 200 },
    );

  try {
    const result = await getProver().verify(body.data.proof, body.data.expect ?? {});
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof ProofError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Verification failed' },
      { status: 502 },
    );
  }
}
