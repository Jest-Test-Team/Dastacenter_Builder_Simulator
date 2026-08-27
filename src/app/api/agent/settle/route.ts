/**
 * The settlement agent, streamed.
 *
 * Server-Sent Events rather than a single JSON response, and the reason is not
 * cosmetic: the agent polls a chain, waits on a transaction receipt, and calls a
 * model. Buffering all of that into one reply would mean the UI could only show
 * a spinner and then a conclusion, which is exactly the shape of a result you
 * cannot audit. Streaming lets each line appear when its work actually finished,
 * so the timings on screen are measurements.
 *
 * This is the first streaming route in the repo. Anything added later should
 * follow it: an async generator in `src/lib/`, encoded here, no logic inline.
 */

import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { runSettlementAgent } from '@/lib/agent/settle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  address: z.string().min(1).max(64),
  chainId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      try {
        for await (const event of runSettlementAgent(body.data)) send(event);
      } catch (error) {
        // A crash mid-run must still reach the terminal as a halt, or the UI
        // sits on a stream that has silently stopped producing.
        send({
          stage: 'blocked',
          at: 'settle',
          reason: error instanceof Error ? error.message : 'Agent run failed',
          elapsedMs: 0,
          line: 'HALTED: agent run failed',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
