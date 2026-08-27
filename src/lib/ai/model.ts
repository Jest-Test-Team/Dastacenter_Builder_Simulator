/**
 * The model binding.
 *
 * Workers AI, reached through the same `getCloudflareContext` accessor the
 * leaderboard uses for D1. Deliberately not a third-party API: the pitch of this
 * app is disclosure discipline, and adding a data processor to answer questions
 * about a privacy contract would be a poor joke.
 *
 * The route runs in workerd — the runtime that cannot host bb.js — so nothing
 * here may pull in WASM or a heavy SDK. A binding call is a method call.
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { AiError } from './types';

/**
 * The model behind every AI skill.
 *
 * Workers AI retires models on its own schedule — `@cf/meta/llama-3.1-8b-instruct`
 * was deprecated on 2026-05-30 and now returns error 5028 rather than an answer,
 * which surfaced only in production because no local test can reach the binding.
 * If the assistant starts erroring with a "was deprecated" message, check
 * `npx wrangler ai models` and update this line.
 *
 * 70B fp8-fast rather than an 8B: the tutor answers from supplied source and the
 * designer must emit parseable JSON, and both degrade badly on a small model.
 * "fast" is Cloudflare's own latency-optimized build, so the trade is mild.
 */
export const AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

interface AiBinding {
  run(
    model: string,
    input: { messages: ChatMessage[]; max_tokens?: number; temperature?: number },
  ): Promise<{ response?: string }>;
}

async function getAiBinding(): Promise<AiBinding | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const ai = (env as { AI?: unknown }).AI;
    if (ai && typeof (ai as AiBinding).run === 'function') return ai as AiBinding;
  } catch {
    // No Cloudflare context: local `next dev`, unit tests, any non-Workers host.
  }
  return null;
}

/**
 * Run a grounded chat completion.
 *
 * Throws rather than inventing an answer when the binding is absent. A tutor
 * that silently degrades into a guess is worse than one that says it is offline,
 * because the reader cannot tell the difference.
 */
export async function complete(messages: ChatMessage[]): Promise<string> {
  const ai = await getAiBinding();
  if (!ai)
    throw new AiError(
      'The assistant is not available in this environment — no Workers AI binding is bound.',
      503,
    );

  // Low temperature: this is comprehension over supplied text, not composition.
  const result = await ai.run(AI_MODEL, { messages, max_tokens: 700, temperature: 0.2 });
  const answer = result.response?.trim();
  if (!answer) throw new AiError('The assistant returned an empty answer.', 502);
  return answer;
}
