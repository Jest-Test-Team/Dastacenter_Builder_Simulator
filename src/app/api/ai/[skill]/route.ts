/**
 * The assistant endpoint.
 *
 * One route, one closed union of skills. There is deliberately no free-form
 * "send this prompt to a model" surface, because that is the surface through
 * which build data eventually leaks — a caller who can shape the whole prompt
 * can put anything in it.
 *
 * Note what the build-facing skills receive: a projection that the *browser*
 * already reduced, re-validated here with a `.strict()` schema so a hand-crafted
 * request cannot smuggle in a field the gate does not define. The server never
 * sees a `BuildState` and cannot ask for one.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { askCompactTutor } from '@/lib/ai/tutor';
import { explainFindings } from '@/lib/ai/explainer';
import { proposeDesign } from '@/lib/ai/designer';
import { GateResultSchema } from '@/lib/ai/disclosure';
import { AiError, AiRequestSchema, AiSkillSchema, GatedRequestSchema } from '@/lib/ai/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ skill: string }> }) {
  const skill = AiSkillSchema.safeParse((await ctx.params).skill);
  if (!skill.success) return NextResponse.json({ error: 'Unknown skill' }, { status: 404 });

  const payload = await req.json().catch(() => null);

  try {
    if (skill.data === 'compact-tutor') {
      const body = AiRequestSchema.safeParse(payload);
      if (!body.success) return invalid(body.error.flatten());
      return NextResponse.json(await askCompactTutor(body.data), { status: 200 });
    }

    const body = GatedRequestSchema.safeParse(payload);
    if (!body.success) return invalid(body.error.flatten());
    const gated = GateResultSchema.safeParse(body.data.gated);
    if (!gated.success) return invalid(gated.error.flatten());

    if (skill.data === 'rule-explainer')
      return NextResponse.json(await explainFindings(gated.data, body.data.question), {
        status: 200,
      });

    if (!body.data.question)
      return NextResponse.json({ error: 'Describe what you want to add.' }, { status: 400 });
    return NextResponse.json(await proposeDesign(gated.data, body.data.question), { status: 200 });
  } catch (err) {
    if (err instanceof AiError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'The assistant failed.' },
      { status: 502 },
    );
  }
}

function invalid(details: unknown) {
  return NextResponse.json({ error: 'Invalid request', details }, { status: 400 });
}
