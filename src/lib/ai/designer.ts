/**
 * Prompt-to-build: the co-designer the roadmap has promised since v2.0.
 *
 * The interesting constraint is what the model is NOT allowed to produce.
 * It proposes *what* to add — block types and quantities, with a reason — and
 * never *where*. Coordinates are the layout, the layout is the most sensitive
 * thing in the model, and the gate never sends it. A model that cannot see the
 * layout has no business inventing one.
 *
 * Placement therefore happens on the client, against the real grid, through the
 * same `canPlace` the builder UI uses. Anything that will not fit is reported as
 * rejected rather than quietly dropped: a suggestion the engine refused is a
 * more useful thing to show an engineer than a suggestion silently discarded.
 *
 * The proposal is advisory. It is applied to a clone and re-scored before the
 * reader decides — the deterministic engine still has the final word, which is
 * the commitment the AI policy page makes.
 */

import { z } from 'zod';
import { getAllBlocks, isValidBlockType } from '@/lib/blocks';
import { complete, AI_MODEL, type ChatMessage } from './model';
import type { DisclosedContext, GateResult } from './disclosure';
import { AiError } from './types';

export const ProposalItemSchema = z.object({
  /** A block id from the catalog. Validated against the registry, not trusted. */
  blockId: z.string(),
  quantity: z.number().int().min(1).max(24),
  why: z.string().max(240),
});
export type ProposalItem = z.infer<typeof ProposalItemSchema>;

export interface DesignProposal {
  items: ProposalItem[];
  /** Items the model named that are not real blocks, kept for honesty. */
  unknownBlockIds: string[];
  summary: string;
  model: string;
  disclosed: string[];
  withheld: string[];
}

/** The catalog is public — it is the block palette every user already sees. */
function catalogBlock(): string {
  return getAllBlocks()
    .map((b) => `- ${b.id} (${b.category}): ${b.displayName}`)
    .join('\n');
}

const SYSTEM = `You suggest additions to a data center design in the Datacenter Builder Simulator.

You must answer with ONLY a JSON object of this exact shape, and no prose before or after:
{"summary": "one sentence", "items": [{"blockId": "...", "quantity": 1, "why": "one sentence"}]}

Rules you must follow:
1. Use ONLY block ids from the catalog below, spelled exactly. Never invent an id.
2. Never propose coordinates or a layout. You have not been shown the layout and you will not be.
3. Never claim the result will be compliant, certified, or reach any tier. A deterministic rules engine scores the design after your suggestion is applied, and it decides, not you.
4. Propose at most 6 items. Prefer the smallest change that addresses the findings.
5. If the design context does not justify any addition, return an empty items array and say why in the summary.`;

function contextBlock(context: DisclosedContext): string {
  const parts: string[] = [];
  if (context.axisScores)
    parts.push(
      `Weakest axes first: ${Object.entries(context.axisScores)
        .sort((a, b) => a[1] - b[1])
        .map(([axis, value]) => `${axis} ${value}`)
        .join(', ')}`,
    );
  if (context.failingRuleIds?.length)
    parts.push(`Failing rules: ${context.failingRuleIds.join(', ')}`);
  if (context.blockCountsByCategory)
    parts.push(
      `Already placed: ${Object.entries(context.blockCountsByCategory)
        .map(([category, n]) => `${category} ${n}`)
        .join(', ')}`,
    );
  if (context.tier) parts.push(`Uptime tier: ${context.tier}`);
  if (context.pue !== undefined) parts.push(`PUE: ${context.pue}`);
  return parts.length > 0 ? parts.join('\n') : 'No design context was disclosed.';
}

/** Small models wrap JSON in prose and fences. Recover the object rather than fail. */
function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw new AiError('The assistant did not return a proposal.', 502);
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new AiError('The assistant returned a proposal that could not be read.', 502);
  }
}

const ResponseSchema = z.object({
  summary: z.string().max(400).default(''),
  items: z.array(ProposalItemSchema).max(6).default([]),
});

export async function proposeDesign(gated: GateResult, request: string): Promise<DesignProposal> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${SYSTEM}\n\n## Block catalog\n${catalogBlock()}\n\n## Design context you were permitted to see\n${contextBlock(gated.context)}`,
    },
    { role: 'user', content: request },
  ];

  const parsed = ResponseSchema.safeParse(extractJson(await complete(messages)));
  if (!parsed.success) throw new AiError('The assistant returned a malformed proposal.', 502);

  // Drop ids that are not real blocks, but say that we did. A hallucinated
  // block silently removed looks identical to a model that had nothing to say.
  const items = parsed.data.items.filter((i) => isValidBlockType(i.blockId));
  const unknownBlockIds = parsed.data.items
    .filter((i) => !isValidBlockType(i.blockId))
    .map((i) => i.blockId);

  return {
    items,
    unknownBlockIds,
    summary: parsed.data.summary,
    model: AI_MODEL,
    disclosed: gated.disclosed,
    withheld: gated.withheld,
  };
}
