/**
 * The WebMCP tool catalog.
 *
 * WebMCP lets a browser page hand an agent a set of callable tools, so the
 * agent operates the *running application* rather than a copy of it. That is
 * the whole reason this file wraps and never reimplements: `place_block` calls
 * the same Zustand action the mouse calls, so it inherits `evaluatePlacement`'s
 * bounds, occupancy and inventory checks. A tool that reimplemented placement
 * would drift from the ghost the user sees, and the agent would start winning
 * arguments it should lose.
 *
 * The harder question is what comes *back*. An agent caller is a third party in
 * exactly the sense `lib/ai/disclosure.ts` means — it is a language model, it
 * keeps transcripts, and it is not the person who drew the layout. So every
 * outbound payload leaves through the same gate the assistant uses. Nothing
 * here builds its own idea of what is safe to say:
 *
 *   - Read tools project through `gate(state, report, choice)`. Its three
 *     never-disclosed items — grid coordinates, the knowledge-graph digest, the
 *     proof blinding factor — are never-disclosed here too, for free, because
 *     this file cannot widen the projection even by accident.
 *   - Projections are **additive**. Every field is written by an explicit line.
 *     Nothing spreads a `BuildState` and deletes keys, because subtractive
 *     redaction is how a field added upstream escapes six months later.
 *   - Two identifiers are allowlisted on purpose and named here so the decision
 *     is reviewable: **block type ids** (catalog data, already public in the
 *     palette) and **instance ids** (nanoids). Instance ids are the only handle
 *     an agent can hold onto to say "remove that one"; they are opaque and
 *     carry no position. Coordinates travel *inbound* only — as an argument the
 *     agent itself supplied — and are never echoed back in a result.
 *
 * The asymmetry is the point. An agent may place a rack at (4, 0, 9) because it
 * chose to; it may never learn where the racks already are.
 */

import { z } from 'zod';
import {
  CATEGORIES,
  getAllBlocks,
  getBlock,
  getBlocksByCategory,
  type BlockCategory,
  type BuildState,
} from '@/lib/blocks';
import { DEFAULT_GRID_SIZE, type Cell, type GridSize } from '@/lib/grid';
import { score } from '@/lib/scoring';
import { allRules } from '@/lib/scoring/rules';
import {
  DISCLOSURE_FIELDS,
  defaultChoice,
  gate,
  NEVER_DISCLOSED,
  type DisclosureChoice,
  type DisclosureField,
} from '@/lib/ai/disclosure';
import { countByType, findNearestLegalCell, useBuildStore } from '@/lib/store/build-store';

/** Bumped when a tool's name or input shape changes. Judges and tests pin it. */
export const WEBMCP_MANIFEST_VERSION = '1.0.0';

/* -------------------------------------------------------------------------- */
/* JSON Schema                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The subset of JSON Schema a WebMCP `inputSchema` needs.
 *
 * Deliberately small. A full zod-to-JSON-Schema converter is a dependency and a
 * surface; six node kinds cover every tool below, and anything it cannot
 * express is a signal the input shape is too clever for an agent to fill in.
 */
export interface JsonSchema {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: Array<string | number>;
  additionalProperties?: boolean;
  default?: unknown;
}

/**
 * Derive a JSON Schema from the zod schema that actually validates the input.
 *
 * Derived, not hand-written beside it: a hand-written schema is a second source
 * of truth that silently stops matching the first, and the agent is the one who
 * finds out.
 */
export function toJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  const def = schema._def as { typeName: string } & Record<string, unknown>;
  const { description } = schema;
  const described = (out: JsonSchema): JsonSchema =>
    description ? { ...out, description } : out;

  switch (def.typeName) {
    case 'ZodOptional':
    case 'ZodNullable':
      return described(toJsonSchema(def.innerType as z.ZodTypeAny));

    case 'ZodDefault': {
      const inner = toJsonSchema(def.innerType as z.ZodTypeAny);
      return described({ ...inner, default: (def.defaultValue as () => unknown)() });
    }

    case 'ZodObject': {
      const shape = (def.shape as () => Record<string, z.ZodTypeAny>)();
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = toJsonSchema(value);
        if (!value.isOptional()) required.push(key);
      }
      return described({ type: 'object', properties, required, additionalProperties: false });
    }

    case 'ZodArray':
      return described({ type: 'array', items: toJsonSchema(def.type as z.ZodTypeAny) });

    case 'ZodString':
      return described({ type: 'string' });

    case 'ZodNumber': {
      const checks = (def.checks ?? []) as Array<{ kind: string }>;
      return described({ type: checks.some((c) => c.kind === 'int') ? 'integer' : 'number' });
    }

    case 'ZodBoolean':
      return described({ type: 'boolean' });

    case 'ZodEnum':
      return described({ type: 'string', enum: [...(def.values as string[])] });

    case 'ZodLiteral': {
      const value = def.value as string | number;
      return described({ type: typeof value === 'number' ? 'number' : 'string', enum: [value] });
    }

    case 'ZodUnion': {
      // Only unions of literals are expressible as a JSON Schema `enum`; that is
      // all the tools below use (rotation is 0 | 1 | 2 | 3).
      const options = (def.options as z.ZodTypeAny[]).map((o) => toJsonSchema(o));
      const values = options.flatMap((o) => o.enum ?? []);
      if (values.length !== options.length) return described({});
      return described({ type: options[0]?.type ?? 'string', enum: values });
    }

    default:
      return described({});
  }
}

/* -------------------------------------------------------------------------- */
/* Tool shape                                                                 */
/* -------------------------------------------------------------------------- */

/** MCP's `CallToolResult`, narrowed to the text content these tools return. */
export interface WebMcpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}

export interface WebMcpTool {
  /** Stable identifier the agent calls. Snake case, matched by the test suite. */
  name: string;
  /** Written for a model, not a developer: what it does and when to reach for it. */
  description: string;
  inputSchema: JsonSchema;
  execute: (input: unknown) => Promise<WebMcpToolResult>;
}

function ok(payload: unknown): WebMcpToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload) }], structuredContent: payload };
}

function failed(message: string): WebMcpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify({ ok: false, reason: message }) }],
    structuredContent: { ok: false, reason: message },
    isError: true,
  };
}

/**
 * Bind a zod schema to a handler once, so the JSON Schema the agent reads and
 * the validation the call survives can never disagree.
 */
function defineTool<S extends z.ZodTypeAny>(spec: {
  name: string;
  description: string;
  schema: S;
  run: (input: z.infer<S>) => unknown;
}): WebMcpTool {
  return {
    name: spec.name,
    description: spec.description,
    inputSchema: toJsonSchema(spec.schema),
    execute: async (input: unknown) => {
      const parsed = spec.schema.safeParse(input ?? {});
      if (!parsed.success) {
        return failed(
          parsed.error.issues
            .map((i) => `${i.path.join('.') || 'input'}: ${i.message}`)
            .join('; '),
        );
      }
      try {
        return ok(spec.run(parsed.data as z.infer<S>));
      } catch (err) {
        return failed(err instanceof Error ? err.message : 'The tool failed.');
      }
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Input schemas                                                              */
/* -------------------------------------------------------------------------- */

const CategorySchema = z.enum(CATEGORIES as [BlockCategory, ...BlockCategory[]]);

const RotationSchema = z
  .union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
  .describe('Quarter turns clockwise about the vertical axis. Defaults to 0.');

const PositionSchema = z
  .object({
    x: z.number().int().describe('Cells east from the west edge of the floor.'),
    y: z.number().int().describe('Cells up from the floor. Use 0 unless stacking.'),
    z: z.number().int().describe('Cells south from the north edge of the floor.'),
  })
  .describe(
    'Where to put it. Omit this and the builder picks the nearest legal free cell for you — ' +
      'preferred, because you cannot see the existing layout.',
  );

const ListBlockTypesInput = z.object({
  category: CategorySchema.optional().describe(
    'Narrow the catalog to one category: structure, site, power, cooling, it, safety or network.',
  ),
});

const PlaceBlockInput = z.object({
  type: z
    .string()
    .min(1)
    .describe('Block type id from list_block_types, for example "rack" or "ups".'),
  position: PositionSchema.optional(),
  rotation: RotationSchema.optional(),
});

const RemoveBlockInput = z.object({
  instanceId: z
    .string()
    .min(1)
    .describe('The instanceId returned by place_block or listed in get_build_snapshot.'),
});

const SnapshotInput = z.object({});

const ScoreBuildInput = z.object({
  include: z
    .array(z.enum(DISCLOSURE_FIELDS))
    .optional()
    .describe(
      'Extra disclosure fields to request beyond the defaults: tier, pue, overallScore. ' +
        'Each one is a deliberate release of commercially sensitive information.',
    ),
});

const ExplainFailingRulesInput = z.object({
  ruleId: z
    .string()
    .optional()
    .describe('Explain only this rule id. Omit to get every failing rule.'),
});

/* -------------------------------------------------------------------------- */
/* Pure projections                                                           */
/* -------------------------------------------------------------------------- */

/** One catalog entry as an agent sees it. Catalog data, not build data. */
export interface AgentBlockType {
  id: string;
  category: BlockCategory;
  displayName: string;
  description: string;
  /** Footprint [w, h, d] in 1m cells — how much room it needs, not where it is. */
  size: [number, number, number];
  tags: string[];
  decorative: boolean;
}

export function projectCatalog(category?: BlockCategory): AgentBlockType[] {
  const blocks = category ? getBlocksByCategory(category) : getAllBlocks();
  return blocks.map((b) => ({
    id: b.id,
    category: b.category,
    displayName: b.displayName,
    description: b.description,
    size: b.size,
    tags: b.tags,
    decorative: b.decorative,
  }));
}

/**
 * What the agent may know about the build.
 *
 * Read the field list as the security claim: counts, ids, and the gate's own
 * output. `state.voxels[*].position` and every `state.byCell` key are absent
 * because nothing here writes them, not because something removed them.
 */
export function projectSnapshot(
  state: BuildState,
  gridSize: GridSize = DEFAULT_GRID_SIZE,
  choice: DisclosureChoice = defaultChoice(),
) {
  const report = score(state);
  const gated = gate(state, report, choice);
  const instances = Object.values(state.voxels).map((v) => ({
    instanceId: v.id,
    type: v.type,
    displayName: getBlock(v.type)?.displayName ?? v.type,
  }));

  return {
    name: state.name,
    scenarioId: state.scenarioId,
    /** Dimensions of the buildable floor, so the agent can aim. Not a layout. */
    gridSize: { w: gridSize.w, h: gridSize.h, d: gridSize.d },
    blockCount: instances.length,
    blockCountsByType: countByType(state),
    instances,
    disclosed: gated.context,
    disclosureLedger: { disclosed: gated.disclosed, withheld: gated.withheld },
  };
}

export function projectScore(state: BuildState, include: DisclosureField[] = []) {
  const choice: DisclosureChoice = { ...defaultChoice() };
  for (const field of include) choice[field] = true;

  const report = score(state);
  const gated = gate(state, report, choice);

  return {
    rulePackVersion: report.rulePackVersion,
    certifiable: report.certifiable,
    level: report.level,
    disclosed: gated.context,
    disclosureLedger: { disclosed: gated.disclosed, withheld: gated.withheld },
  };
}

const RULE_INDEX = new Map(allRules.map((r) => [r.id, r]));

/**
 * Why the build is failing, in rule terms.
 *
 * `relatedBlocks` survives because it holds instance ids, which the agent is
 * already allowed to hold — and without it "fix the redundancy problem" has no
 * referent. It is checked against the same allowlist as everything else.
 */
export function projectFailingRules(state: BuildState, ruleId?: string) {
  const report = score(state);
  const failing = report.issues
    .filter((i) => i.severity === 'error' || i.severity === 'critical')
    .filter((i) => (ruleId ? i.ruleId === ruleId : true))
    .map((i) => ({
      ruleId: i.ruleId,
      severity: i.severity,
      message: i.message,
      hint: i.hint,
      standard: i.standard ?? RULE_INDEX.get(i.ruleId)?.standard,
      axis: RULE_INDEX.get(i.ruleId)?.axis,
      relatedBlockIds: i.relatedBlocks ?? [],
      policyFix: i.policyFix,
    }));

  return {
    rulePackVersion: report.rulePackVersion,
    failingCount: failing.length,
    rules: failing,
  };
}

/* -------------------------------------------------------------------------- */
/* Store-bound helpers                                                        */
/* -------------------------------------------------------------------------- */

/** The live store is a module singleton, so tools drive the same state the canvas renders. */
function liveState() {
  return useBuildStore.getState();
}

/** Centre of the floor — the seed for auto-placement when the agent gives no cell. */
function floorCentre(gridSize: GridSize): Cell {
  return { x: Math.floor(gridSize.w / 2), y: 0, z: Math.floor(gridSize.d / 2) };
}

/* -------------------------------------------------------------------------- */
/* The catalog                                                                */
/* -------------------------------------------------------------------------- */

export const WEBMCP_TOOLS: readonly WebMcpTool[] = Object.freeze([
  defineTool({
    name: 'list_block_types',
    description:
      'List every block type that can be placed in the data center, with its category, ' +
      'footprint and what it is for. Call this before place_block so you use real type ids.',
    schema: ListBlockTypesInput,
    run: (input) => {
      const blocks = projectCatalog(input.category);
      return { count: blocks.length, categories: [...CATEGORIES], blocks };
    },
  }),

  defineTool({
    name: 'place_block',
    description:
      'Place one block into the live 3D build. Omit position and the builder drops it on the ' +
      'nearest legal free cell, which is usually what you want since you cannot see the layout. ' +
      'Refuses out-of-bounds cells, occupied cells and blocks the scenario inventory is out of, ' +
      'and tells you which. Returns the instanceId to pass to remove_block.',
    schema: PlaceBlockInput,
    run: (input) => {
      const state = liveState();
      if (!getBlock(input.type)) return { ok: false, reason: `Unknown block type: ${input.type}` };

      const rotation = input.rotation ?? 0;
      const position =
        input.position ??
        findNearestLegalCell({
          type: input.type,
          target: floorCentre(state.gridSize),
          rotation,
          gridSize: state.gridSize,
          byCell: state.byCell,
          inventory: state.inventory,
        });

      if (!position)
        return { ok: false, reason: 'No legal cell is free for that block on this floor.' };

      const result = state.placeBlock(input.type, position, rotation);
      // Note the absence: the cell is not echoed back, even on success.
      return result.ok
        ? { ok: true, instanceId: result.id, type: input.type }
        : { ok: false, reason: result.reason };
    },
  }),

  defineTool({
    name: 'remove_block',
    description:
      'Remove one placed block from the live build by its instanceId and return it to inventory.',
    schema: RemoveBlockInput,
    run: (input) => {
      const state = liveState();
      const instance = state.voxels[input.instanceId];
      if (!instance) return { ok: false, reason: `No block with id ${input.instanceId}.` };
      state.removeBlock(input.instanceId);
      return { ok: true, instanceId: input.instanceId, type: instance.type };
    },
  }),

  defineTool({
    name: 'get_build_snapshot',
    description:
      'Summarise the current build: floor dimensions, how many of each block type are placed, ' +
      'the instanceIds you can remove, and the disclosure-gated scoring context. ' +
      'Block coordinates are never returned.',
    schema: SnapshotInput,
    run: () => {
      const state = liveState();
      return projectSnapshot(state.exportSnapshot(), state.gridSize);
    },
  }),

  defineTool({
    name: 'score_build',
    description:
      'Score the current build against the Uptime Tier / TIA-942 / ASHRAE / NFPA rule pack. ' +
      'Returns per-axis scores and failing rule ids by default. Exact overall score, PUE and ' +
      'tier are commercially sensitive and only returned if you ask for them in "include".',
    schema: ScoreBuildInput,
    run: (input) => {
      const state = liveState();
      return projectScore(state.exportSnapshot(), input.include ?? []);
    },
  }),

  defineTool({
    name: 'explain_failing_rules',
    description:
      'Explain which compliance rules the current build breaks, with the standard each comes ' +
      'from, the scoring axis it hurts, a hint for fixing it, and the instanceIds involved. ' +
      'Use this to decide what to place next.',
    schema: ExplainFailingRulesInput,
    run: (input) => {
      const state = liveState();
      return projectFailingRules(state.exportSnapshot(), input.ruleId);
    },
  }),
]);

/* -------------------------------------------------------------------------- */
/* Manifest                                                                   */
/* -------------------------------------------------------------------------- */

export interface WebMcpManifest {
  protocol: 'webmcp';
  version: string;
  tools: Array<{ name: string; description: string; inputSchema: JsonSchema }>;
  /**
   * The disclosure contract, stated once here rather than repeated in every
   * tool result. `neverDisclosed` is copied straight from the gate, so this
   * cannot drift from what the code actually enforces.
   */
  disclosure: {
    defaultFields: DisclosureField[];
    optionalFields: DisclosureField[];
    neverDisclosed: string[];
  };
}

/**
 * The machine-readable surface. Served by `/api/webmcp/manifest` so a reviewer
 * can see the exact tool set without a WebMCP-capable browser, and so the test
 * suite has something to assert the disclosure claim against.
 */
export function toolManifest(): WebMcpManifest {
  const defaults = defaultChoice();
  return {
    protocol: 'webmcp',
    version: WEBMCP_MANIFEST_VERSION,
    tools: WEBMCP_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
    disclosure: {
      defaultFields: DISCLOSURE_FIELDS.filter((f) => defaults[f] === true),
      optionalFields: DISCLOSURE_FIELDS.filter((f) => defaults[f] !== true),
      neverDisclosed: [...NEVER_DISCLOSED],
    },
  };
}
