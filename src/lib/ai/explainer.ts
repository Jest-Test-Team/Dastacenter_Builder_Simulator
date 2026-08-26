/**
 * Rule explainer.
 *
 * The model's job here is phrasing, not judgement. The failing rule identifiers
 * come from the deterministic scoring engine, and so does every standards
 * citation attached to them — the model is handed the rule's own `standard`
 * string and told to use it rather than recall one.
 *
 * That split matters more than it looks. A model asked "is this design NFPA 75
 * compliant?" will answer, fluently, and be wrong in a way that reads exactly
 * like being right. A model asked "explain, in plain language, why rule
 * NFPA.003 fired" cannot invent the finding, because the finding was already
 * made by a rules engine that is byte-stable and testable.
 *
 * The app's AI policy commits to this: the scoring engine is never AI.
 */

import { allRules } from '@/lib/scoring';
import { complete, AI_MODEL, type ChatMessage } from './model';
import type { DisclosedContext, GateResult } from './disclosure';
import { AiError, type AiAnswer } from './types';

const SYSTEM = `You explain data center design findings to an engineer.

You are given findings that a deterministic rules engine has ALREADY made, each with its own standards citation. Your job is to phrase the remediation clearly.

Rules you must follow:
1. Never state that a design is or is not compliant, certified, or of any particular tier. You did not score it and you cannot.
2. Never cite a standard that was not given to you. If a finding arrives without a citation, explain it without one.
3. Never invent findings. If the list is empty, say the build raises no blocking issues and stop.
4. You have deliberately not been shown the layout. Do not ask for it, and do not guess at it.
5. Be concrete and brief: for each finding, one sentence on why it matters and one on what to place or change. Under 250 words total.`;

/** The rule's own metadata, so the citation comes from the engine, not the model. */
function describeRules(ruleIds: string[]): string {
  const known = ruleIds
    .map((id) => allRules.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  if (known.length === 0) return '';
  return known
    .map((r) => `- ${r.id} (axis: ${r.axis}; standard: ${r.standard})`)
    .join('\n');
}

function contextBlock(context: DisclosedContext): string {
  const parts: string[] = [];
  if (context.axisScores)
    parts.push(
      `Per-axis scores (0-100): ${Object.entries(context.axisScores)
        .map(([axis, value]) => `${axis} ${value}`)
        .join(', ')}`,
    );
  if (context.blockCountsByCategory)
    parts.push(
      `Blocks placed by category: ${Object.entries(context.blockCountsByCategory)
        .map(([category, n]) => `${category} ${n}`)
        .join(', ')}`,
    );
  if (context.tier) parts.push(`Uptime tier: ${context.tier}`);
  if (context.pue !== undefined) parts.push(`PUE: ${context.pue}`);
  if (context.overallScore !== undefined) parts.push(`Overall score: ${context.overallScore}`);
  return parts.length > 0 ? parts.join('\n') : 'No design context was disclosed.';
}

export async function explainFindings(
  gated: GateResult,
  question?: string,
): Promise<AiAnswer & { disclosed: string[]; withheld: string[] }> {
  const ruleIds = gated.context.failingRuleIds;
  if (!ruleIds)
    throw new AiError(
      'The rule explainer needs failing rule IDs, and that field is currently withheld.',
      400,
    );

  const findings = describeRules(ruleIds);
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${SYSTEM}\n\n## Findings from the rules engine\n${findings || '(none — the build raises no blocking issues)'}\n\n## Design context you were permitted to see\n${contextBlock(gated.context)}`,
    },
    {
      role: 'user',
      content:
        question?.trim() ||
        'Explain these findings and what to change, in priority order.',
    },
  ];

  return {
    answer: await complete(messages),
    sources: ruleIds,
    model: AI_MODEL,
    disclosed: gated.disclosed,
    withheld: gated.withheld,
  };
}
