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

/** Small, fast, and adequate for grounded Q&A over excerpts we supply. */
export const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';

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
