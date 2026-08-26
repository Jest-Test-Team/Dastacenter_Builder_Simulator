/**
 * The Compact tutor.
 *
 * Answers questions about the privacy track using the real circuit source as
 * context. This is the safest skill in the assistant by construction: its entire
 * context is text that is already public in this repository, so there is no
 * build state, no wallet, no score and nothing to redact. It is deliberately the
 * first one shipped.
 *
 * Grounding rule: the model is given the source and told to answer from it, or
 * to say it cannot. It is not a compliance oracle and the prompt says so.
 */

import {
  LEDGER,
  MINT_CERTIFICATE,
  NOIR_MAIN,
  OPEN_COMMITMENT,
  PRAGMA,
  PROVE_THRESHOLD,
  REGISTRY,
  WITNESSES,
} from '@/lib/content/compact-source';
import { getModule } from '@/lib/content/modules';
import { complete, AI_MODEL, type ChatMessage } from './model';
import type { AiAnswer, AiRequest } from './types';

/** Everything the tutor may see. All of it is public source from this repo. */
const CONTEXT: { label: string; source: string }[] = [
  { label: 'circuits/datacenter-score.compact — header', source: PRAGMA },
  { label: 'circuits/datacenter-score.compact — ledger state', source: LEDGER },
  { label: 'circuits/datacenter-score.compact — certificate registry', source: REGISTRY },
  { label: 'circuits/datacenter-score.compact — witnesses', source: WITNESSES },
  { label: 'circuits/datacenter-score.compact — proveThreshold', source: PROVE_THRESHOLD },
  { label: 'circuits/datacenter-score.compact — mintCertificate', source: MINT_CERTIFICATE },
  { label: 'circuits/datacenter-score.compact — openCommitment', source: OPEN_COMMITMENT },
  { label: 'circuits/noir/src/main.nr — main', source: NOIR_MAIN },
];

const SYSTEM = `You are a tutor for the "Privacy engineering with Compact" track of the Datacenter Builder Simulator.

Compact is Midnight's smart-contract language. Its distinguishing features:
- \`ledger\` declares public on-chain state; \`witness\` declares private inputs supplied locally and never transmitted.
- A value derived from a witness cannot reach ledger state unless wrapped in \`disclose(...)\`, so every leak is one reviewable word.

Rules you must follow:
1. Answer ONLY from the source excerpts and lesson text provided below. If the answer is not in them, say so plainly and suggest which module covers it.
2. Never invent Compact syntax, standard-library functions or compiler behaviour. If you are unsure whether something exists, say you are unsure.
3. Never claim a design is compliant, certified, or scores any particular value. The scoring engine in this app is a deterministic rules engine and you are not it.
4. Quote the excerpt you are relying on when it helps, and keep answers under 200 words.`;

function contextBlock(): string {
  return CONTEXT.map((c) => `### ${c.label}\n\`\`\`\n${c.source.trim()}\n\`\`\``).join('\n\n');
}

/** The lesson the reader is on, when they told us, so the answer can match its level. */
function lessonBlock(moduleId?: string): string {
  const current = moduleId ? getModule(moduleId) : undefined;
  if (!current || current.track !== 'privacy') return '';
  const lessons = current.lessons.map((l) => `#### ${l.title}\n${l.body}`).join('\n\n');
  return `\n\n## The module the reader is currently on: "${current.title}"\n${current.summary}\n\n${lessons}`;
}

export async function askCompactTutor(request: AiRequest): Promise<AiAnswer> {
  const messages: ChatMessage[] = [
    { role: 'system', content: `${SYSTEM}\n\n## Source excerpts\n\n${contextBlock()}${lessonBlock(request.moduleId)}` },
    { role: 'user', content: request.question },
  ];

  return {
    answer: await complete(messages),
    sources: CONTEXT.map((c) => c.label),
    model: AI_MODEL,
  };
}
