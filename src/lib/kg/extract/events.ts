/**
 * Event and policy extractor (stage 6) — things that happened, not things that are.
 *
 * Scoring issues, link failures and intent deployments are first-class event
 * nodes with typed arguments and a time anchor. Flattening an issue into an
 * attribute on each asset it implicates would lose which assets one issue tied
 * together, and lose the time anchor entirely.
 */

import type { BuildState } from '@/lib/blocks';
import { score } from '@/lib/scoring';
import { POLICY_GROUPS, type PolicyKey } from '@/lib/scoring/policy';
import { emptyExtraction, type ExtractionResult } from '../types';
import { canonicalStandard, makeEdge, makeNode, nodeId, provenance, type ExtractContext } from './common';

const EXTRACTOR = 'events';

/**
 * Which standard each policy group contributes compliance evidence towards.
 * Deterministic and explicit: a policy setting only claims SATISFIES for a
 * standard whose scope it actually falls inside.
 */
export const POLICY_GROUP_STANDARDS: Record<string, string[]> = {
  'deterrence-physical': ['SEC'],
  'deterrence-logical': ['SEC'],
  'deterrence-admin': ['SEC', 'ISO27'],
  preventive: ['SEC', 'ISO27'],
  detective: ['SEC', 'ISO27'],
  corrective: ['SEC', 'ISO27'],
  recovery: ['SEC', 'ISO27'],
  compensating: ['SEC'],
  privacy: ['PRIV', 'ISO27'],
  esg: ['ESG'],
};

/**
 * Standard families. A rule's `standard` field is free text — "Uptime Tier II",
 * "Uptime Tier III", "ASHRAE TC 9.9 A1" — so uppercasing it verbatim would mint
 * a separate Standard node per tier and per class. Queries like "which
 * standards does this build violate" would then fragment across near-duplicates,
 * which is the identity failure fusion exists to prevent; resolving the family
 * at extraction time is the canonical-form rule the ontology declares.
 */
const STANDARD_FAMILIES: Array<[RegExp, string]> = [
  [/uptime/i, 'UPTIME'],
  [/tia/i, 'TIA-942'],
  [/ashrae/i, 'ASHRAE'],
  [/nfpa/i, 'NFPA'],
  [/en\s*-?\s*50600/i, 'EN-50600'],
  [/iso.*27/i, 'ISO27'],
  [/gdpr/i, 'GDPR'],
];

/** Canonical standard code for an issue: its declared family, else the rule id's prefix. */
export function standardOfIssue(ruleId: string, declared?: string): string {
  if (declared && declared.trim()) {
    for (const [pattern, code] of STANDARD_FAMILIES) if (pattern.test(declared)) return code;
    // Unrecognised but declared: keep it, normalised into a single token so it
    // cannot collide with a family code by accident.
    return canonicalStandard(declared).replace(/\s+/g, '-');
  }
  return canonicalStandard(ruleId.split('.')[0] ?? 'UNKNOWN');
}

export function extractEvents(state: BuildState, ctx: ExtractContext): ExtractionResult {
  const result = emptyExtraction();
  const report = score(state);
  const standards = new Set<string>();

  const declared = new Map<string, Set<string>>();
  const declareStandard = (raw: string, source: string, surfaceForm?: string) => {
    const code = canonicalStandard(raw);
    if (!code) return code;
    // The surface form is kept as an alias so the exact wording a rule used is
    // never lost by canonicalisation.
    const aliases = declared.get(code) ?? new Set<string>();
    if (surfaceForm && surfaceForm !== code) aliases.add(surfaceForm);
    declared.set(code, aliases);
    if (standards.has(code)) return code;
    standards.add(code);
    result.nodes.push(
      makeNode('Standard', code, code, { code }, provenance(EXTRACTOR, source, ctx), {
        aliases: [...aliases],
      }),
    );
    return code;
  };

  // --- ScoreEvaluated ------------------------------------------------------
  const evaluationId = `${ctx.rootId}-score`;
  result.nodes.push(
    makeNode(
      'ScoreEvaluated',
      evaluationId,
      `Rating ${report.score} (${report.level})`,
      {
        score: report.score,
        competitionScore: report.competitionScore,
        tier: report.tier,
        level: report.level,
        pue: report.pue,
        wue: report.wue,
        rulePackVersion: report.rulePackVersion,
        at: ctx.now,
      },
      provenance(EXTRACTOR, 'scoring/score', ctx),
      { at: ctx.now },
    ),
  );
  result.edges.push(
    makeEdge(
      'SCORED',
      nodeId('ScoreEvaluated', evaluationId),
      ctx.rootId,
      provenance(EXTRACTOR, 'scoring/score', ctx),
    ),
  );

  // --- IssueRaised ---------------------------------------------------------
  for (const issue of report.issues) {
    const source = `scoring/issues/${issue.ruleId}`;
    const prov = provenance(EXTRACTOR, source, ctx);
    const self = nodeId('IssueRaised', issue.ruleId);
    result.nodes.push(
      makeNode(
        'IssueRaised',
        issue.ruleId,
        issue.message,
        {
          ruleId: issue.ruleId,
          severity: issue.severity,
          message: issue.message,
          hint: issue.hint,
          policyFix: issue.policyFix,
          at: ctx.now,
        },
        prov,
        { at: ctx.now },
      ),
    );
    result.edges.push(makeEdge('RAISED_IN', self, ctx.rootId, prov));

    const code = declareStandard(standardOfIssue(issue.ruleId, issue.standard), source, issue.standard);
    if (code) result.edges.push(makeEdge('CITES_STANDARD', self, nodeId('Standard', code), prov));

    for (const blockId of issue.relatedBlocks ?? []) {
      if (!state.voxels[blockId]) continue; // Never invent an entity in relation extraction.
      result.edges.push(makeEdge('VIOLATES', self, nodeId('Asset', blockId), prov));
    }
  }

  // --- LinkFailed ----------------------------------------------------------
  for (const link of Object.values(state.network?.links ?? {})) {
    if (link.enabled) continue;
    const source = `network/links/${link.id}`;
    const prov = provenance(EXTRACTOR, source, ctx);
    const self = nodeId('LinkFailed', link.id);
    result.nodes.push(
      makeNode(
        'LinkFailed',
        link.id,
        `${link.id} out of service`,
        { linkId: link.id, reason: 'admin-down', at: ctx.now },
        prov,
        { at: ctx.now },
      ),
    );
    result.edges.push(makeEdge('AFFECTS', self, nodeId('Link', link.id), prov));
  }

  // --- IntentDeployed ------------------------------------------------------
  for (const intent of Object.values(state.network?.intents ?? {})) {
    if (intent.status !== 'deployed') continue;
    const source = `network/intents/${intent.id}`;
    const prov = provenance(EXTRACTOR, source, ctx);
    const self = nodeId('IntentDeployed', intent.id);
    result.nodes.push(
      makeNode(
        'IntentDeployed',
        intent.id,
        `${intent.name} deployed`,
        { intentId: intent.id, message: intent.lastMessage, at: ctx.now },
        prov,
        { at: ctx.now },
      ),
    );
    result.edges.push(makeEdge('DEPLOYS', self, nodeId('Intent', intent.id), prov));
  }

  // --- PolicySetting -------------------------------------------------------
  for (const group of POLICY_GROUPS) {
    for (const key of group.keys) {
      const value = state.policies[key as PolicyKey];
      const source = `policies/${key}`;
      const prov = provenance(EXTRACTOR, source, ctx);
      const self = nodeId('PolicySetting', key);
      result.nodes.push(
        makeNode(
          'PolicySetting',
          key,
          key,
          { key, value, group: group.id },
          prov,
        ),
      );
      // Only a control the operator explicitly switched on is evidence of
      // compliance. Numeric and string settings are targets, not controls —
      // `esg.pue_target` and `corrective.patching_cadence_days` ship with
      // defaults nobody chose, and asserting SATISFIES from them would be
      // co-occurrence dressed up as an assertion.
      if (value !== true) continue;
      for (const raw of POLICY_GROUP_STANDARDS[group.id] ?? []) {
        const code = declareStandard(raw, source);
        if (code) result.edges.push(makeEdge('SATISFIES', self, nodeId('Standard', code), prov));
      }
    }
  }

  return result;
}
