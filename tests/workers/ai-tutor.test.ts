/**
 * Runs inside real workerd, not Node.
 *
 * The assistant route ships to the edge, and the edge is the runtime that
 * already refused bb.js. A skill that pulls in a Node builtin or a WASM module
 * passes every jsdom test and 502s in production, so the import graph of
 * `src/lib/ai/` is exercised here rather than in the Node suite.
 *
 * The other property pinned here is the disclosure claim the tutor makes to the
 * reader: its prompt is built only from source that is already public in this
 * repository. A future edit that quietly feeds build state into the tutor's
 * context should fail a test, not a review.
 */

import { describe, expect, it } from 'vitest';
import { askCompactTutor } from '@/lib/ai/tutor';
import { AiError, AiRequestSchema, AiSkillSchema } from '@/lib/ai/types';

describe('assistant request validation', () => {
  it('accepts a well-formed question', () => {
    const parsed = AiRequestSchema.safeParse({
      question: 'What does disclose do?',
      moduleId: 'compact-disclose',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an empty question and an over-long one', () => {
    expect(AiRequestSchema.safeParse({ question: '' }).success).toBe(false);
    expect(AiRequestSchema.safeParse({ question: 'x'.repeat(601) }).success).toBe(false);
  });

  it('exposes a closed set of skills', () => {
    expect(AiSkillSchema.safeParse('compact-tutor').success).toBe(true);
    expect(AiSkillSchema.safeParse('anything-else').success).toBe(false);
  });
});

describe('compact tutor in workerd', () => {
  it('reports being offline rather than guessing when no AI binding is bound', async () => {
    // Miniflare here has no `ai` binding, which is exactly the shape of a
    // misconfigured deploy. The tutor must say so, not degrade into invention.
    await expect(
      askCompactTutor({ question: 'What is a witness?', moduleId: 'compact-basics' }),
    ).rejects.toBeInstanceOf(AiError);
  });
});
