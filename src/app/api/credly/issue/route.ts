import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { BuildSnapshot } from '@/lib/store/build-store';
import { mintCertificateOnChain, MintError } from '@/lib/sbt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MintRequestSchema = z.object({
  snapshot: z.object({}).passthrough(),
  recipientAddress: z.string().min(1),
  recipientName: z.string().optional(),
  svgDataUri: z.string().min(1),
  chainId: z.number().int().optional(),
  buildId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = MintRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: body.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await mintCertificateOnChain({
      snapshot: body.data.snapshot as unknown as BuildSnapshot,
      recipientAddress: body.data.recipientAddress,
      recipientName: body.data.recipientName,
      svgDataUri: body.data.svgDataUri,
      chainId: body.data.chainId,
      buildId: body.data.buildId,
      baseUrl: new URL(req.url).origin,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof MintError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'SBT mint failed' },
      { status: 502 },
    );
  }
}
