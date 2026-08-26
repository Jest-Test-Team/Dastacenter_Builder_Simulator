/**
 * Shared types for the assistant.
 *
 * Every skill answers the same shape, and every skill declares the disclosure
 * it needs. Nothing here reaches a model without passing the disclosure gate
 * first — see `disclosure.ts`.
 */

import { z } from 'zod';

/** The skills the assistant exposes. One route, one union, no free-form prompts. */
export const AI_SKILLS = ['compact-tutor', 'rule-explainer', 'design-proposal'] as const;
export const AiSkillSchema = z.enum(AI_SKILLS);
export type AiSkill = z.infer<typeof AiSkillSchema>;

export const AiRequestSchema = z.object({
  /** The user's question. Length-capped so a prompt cannot be used as a tunnel. */
  question: z.string().trim().min(3).max(600),
  /** Which lesson the question came from, when the caller knows. */
  moduleId: z.string().max(64).optional(),
});
export type AiRequest = z.infer<typeof AiRequestSchema>;

/**
 * A request from a skill that needs to see something about the build.
 *
 * It carries the *already gated* projection, never a build. The gate runs in the
 * browser (see `disclosure.ts`); this is what survived it.
 */
export const GatedRequestSchema = z.object({
  question: z.string().trim().max(600).optional(),
  gated: z.unknown(),
});

export interface AiAnswer {
  answer: string;
  /** Which source excerpts the answer was grounded in, for the reader to check. */
  sources: string[];
  /** The model that produced it, named so an answer is never mistaken for doctrine. */
  model: string;
}

export class AiError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message);
    this.name = 'AiError';
  }
}
