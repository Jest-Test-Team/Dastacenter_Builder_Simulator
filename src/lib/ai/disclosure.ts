/**
 * The disclosure gate.
 *
 * Compact will not let a value derived from a witness reach public state unless
 * the line says `disclose(...)`. That is the discipline this file applies to a
 * different boundary: the one between a private build and a language model.
 *
 * The rule is the same in both places — **leakage must be deliberate, named, and
 * reviewable** — and so is the shape of the mistake it prevents. Handing a model
 * the whole `BuildState` "just so it has context" looks exactly like handing it
 * a redacted projection, right up until someone reads the logs.
 *
 * So no skill ever receives a `BuildState`. A skill declares which fields it
 * needs; the gate projects exactly those and reports what it did, field by
 * field, so the UI can show the reader the outbound payload before it is sent.
 *
 * Three fields have no toggle and never leave: grid coordinates, the
 * knowledge-graph digest, and the blinding factor. Coordinates are the layout —
 * the single most commercially sensitive thing in the model. The digest and the
 * blinding are the ZK commitment's preimage, and a commitment whose preimage has
 * been handed to a third party is not hiding anything.
 */

import { z } from 'zod';
import type { BuildState } from '@/lib/blocks';
import { getBlock } from '@/lib/blocks';
import type { RatingReport } from '@/lib/scoring';

/** Every field a skill may ask for. There is no "everything" option by design. */
export const DISCLOSURE_FIELDS = [
  'axisScores',
  'failingRuleIds',
  'blockCountsByCategory',
  'tier',
  'pue',
  'overallScore',
] as const;
export type DisclosureField = (typeof DISCLOSURE_FIELDS)[number];

/** What each field is, in the reader's words, and whether it is on by default. */
export const FIELD_INFO: Record<
  DisclosureField,
  { label: string; describes: string; defaultOn: boolean }
> = {
  axisScores: {
    label: 'Per-axis scores',
    describes: 'Six numbers 0–100: redundancy, cooling, power, safety, efficiency, security.',
    defaultOn: true,
  },
  failingRuleIds: {
    label: 'Failing rule IDs',
    describes: 'Which rules your build breaks, by identifier. Not what you built.',
    defaultOn: true,
  },
  blockCountsByCategory: {
    label: 'Block counts by category',
    describes: 'How many power, cooling, IT, safety and network blocks — never where they are.',
    defaultOn: true,
  },
  tier: {
    label: 'Uptime tier',
    describes: 'The tier label your build achieves, I–IV or F.',
    defaultOn: false,
  },
  pue: {
    label: 'PUE',
    describes: 'Your power usage effectiveness. Commercially sensitive; off unless you say so.',
    defaultOn: false,
  },
  overallScore: {
    label: 'Exact overall score',
    describes:
      'The precise figure. The whole point of the threshold proof is not publishing this — sending it to a model is your call, but make it knowingly.',
    defaultOn: false,
  },
};

/** Fields that have no toggle because no answer is worth what they cost. */
export const NEVER_DISCLOSED = [
  'Grid coordinates of every block (the layout)',
  'The knowledge-graph digest',
  'The proof blinding factor',
  'Wallet address and session identity',
] as const;

export type DisclosureChoice = Partial<Record<DisclosureField, boolean>>;

export function defaultChoice(): DisclosureChoice {
  return Object.fromEntries(
    DISCLOSURE_FIELDS.map((f) => [f, FIELD_INFO[f].defaultOn]),
  ) as DisclosureChoice;
}

/** The projection that is actually sent. Every key here is one the reader allowed. */
export interface DisclosedContext {
  axisScores?: RatingReport['breakdown'];
  failingRuleIds?: string[];
  blockCountsByCategory?: Record<string, number>;
  tier?: string;
  pue?: number;
  overallScore?: number;
}

/**
 * The wire form of a gate result.
 *
 * The gate runs in the *browser*, because that is the only place the build
 * exists — the server never receives a `BuildState` and has no way to widen the
 * projection after the fact. What crosses the network is this, already reduced,
 * and the server re-validates it so a hand-crafted request cannot smuggle a
 * field the projection does not define.
 */
export const DisclosedContextSchema = z
  .object({
    axisScores: z
      .object({
        redundancy: z.number(),
        cooling: z.number(),
        power: z.number(),
        safety: z.number(),
        efficiency: z.number(),
        security: z.number(),
      })
      .optional(),
    failingRuleIds: z.array(z.string().max(80)).max(64).optional(),
    blockCountsByCategory: z.record(z.string().max(32), z.number()).optional(),
    tier: z.string().max(8).optional(),
    pue: z.number().optional(),
    overallScore: z.number().optional(),
  })
  .strict();

export const GateResultSchema = z.object({
  context: DisclosedContextSchema,
  disclosed: z.array(z.enum(DISCLOSURE_FIELDS)).default([]),
  withheld: z.array(z.enum(DISCLOSURE_FIELDS)).default([]),
});

export interface GateResult {
  context: DisclosedContext;
  /** What crossed, and what was held back, for the disclosure ledger UI. */
  disclosed: DisclosureField[];
  withheld: DisclosureField[];
}

function countByCategory(state: BuildState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const instance of Object.values(state.voxels)) {
    const category = getBlock(instance.type)?.category;
    if (!category) continue;
    counts[category] = (counts[category] ?? 0) + 1;
  }
  return counts;
}

/**
 * Project a build down to exactly what was allowed.
 *
 * Note the shape: fields are added by an explicit `if`, one per field, never by
 * spreading a report and deleting keys. Subtractive redaction is how secrets
 * escape — a field added upstream is included by default and nobody notices.
 * Here, a new field on `RatingReport` reaches a model only when someone writes
 * a line here to let it.
 */
export function gate(
  state: BuildState,
  report: RatingReport,
  choice: DisclosureChoice = defaultChoice(),
): GateResult {
  const context: DisclosedContext = {};
  const disclosed: DisclosureField[] = [];
  const withheld: DisclosureField[] = [];

  const allow = (field: DisclosureField) => {
    if (choice[field]) {
      disclosed.push(field);
      return true;
    }
    withheld.push(field);
    return false;
  };

  if (allow('axisScores')) context.axisScores = report.breakdown;
  if (allow('failingRuleIds'))
    context.failingRuleIds = report.issues
      .filter((i) => i.severity === 'error' || i.severity === 'critical')
      .map((i) => i.ruleId);
  if (allow('blockCountsByCategory')) context.blockCountsByCategory = countByCategory(state);
  if (allow('tier')) context.tier = report.tier;
  if (allow('pue')) context.pue = report.pue;
  if (allow('overallScore')) context.overallScore = report.score;

  return { context, disclosed, withheld };
}
