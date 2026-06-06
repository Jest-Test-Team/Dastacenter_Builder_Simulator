/**
 * Block type system.
 *
 * Every placeable thing in the data center is a "block" with a strict type.
 * Blocks carry metadata that the scoring engine reads to evaluate Uptime
 * Tier / TIA-942 / ASHRAE / NFPA / etc. compliance.
 *
 * The block catalog is split into:
 *  - 7 visual categories (3D placeable): structure, site, power, cooling, it, safety, network
 *  - 1 policy plane (toggle panel): deterrence, 5-function controls, ESG, privacy
 */

import { z } from 'zod';
import { defaultPolicyState, type PolicyState } from '@/lib/scoring/policy';

export const BlockCategorySchema = z.enum([
  'structure',
  'site',
  'power',
  'cooling',
  'it',
  'safety',
  'network',
]);
export type BlockCategory = z.infer<typeof BlockCategorySchema>;

/** Connection port kinds. */
export const PortKindSchema = z.enum(['power', 'water', 'network', 'data']);
export type PortKind = z.infer<typeof PortKindSchema>;

/** A port a block can connect to. */
export const PortSchema = z.object({
  kind: PortKindSchema,
  direction: z.enum(['in', 'out', 'bi']),
  capacity: z.number().nonnegative().default(0),
  /** Optional: only connect to specific block categories. */
  accepts: z.array(BlockCategorySchema).optional(),
});
export type Port = z.infer<typeof PortSchema>;

/** A "rule" attached to a block used by the scoring engine. */
export const BlockRuleSchema = z.object({
  /** BlockType ids that MUST exist (somewhere) for this block to be valid. */
  mustHave: z.array(z.string()).optional(),
  /** BlockType ids that cannot coexist with this block. */
  conflictsWith: z.array(z.string()).optional(),
  /** Min Chebyshev distance to a given block type id. */
  minDistance: z
    .object({
      blockType: z.string(),
      cells: z.number().int().nonnegative(),
    })
    .optional(),
  /** Max Chebyshev distance to a given block type id. */
  maxDistance: z
    .object({
      blockType: z.string(),
      cells: z.number().int().positive(),
    })
    .optional(),
});
export type BlockRule = z.infer<typeof BlockRuleSchema>;

/** Definition of a block type. Pure data; instances live in the build store. */
export const BlockDefSchema = z.object({
  id: z.string(),
  category: BlockCategorySchema,
  displayName: z.string(),
  shortName: z.string().optional(),
  description: z.string(),
  /** 1m voxel size [w, h, d] — minimum 1×1×1. */
  size: z.tuple([z.number().int().positive(), z.number().int().positive(), z.number().int().positive()]),
  /** Color for placeholder/ghost rendering (hex). */
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  /** Tags for search/filter. */
  tags: z.array(z.string()).default([]),
  /** Power draw in kW (positive = draws, negative = generates). */
  powerDraw: z.number().default(0),
  /** Heat output in kW. */
  heatLoad: z.number().default(0),
  /** Uptime tier role. */
  tierRole: z.enum(['N', 'N+1', '2N', 'none']).default('none'),
  /** Connection ports. */
  ports: z.array(PortSchema).default([]),
  /** Scoring-relevant rules. */
  rules: BlockRuleSchema.optional(),
  /** Standard citations. */
  standards: z.array(z.string()).default([]),
  /** Whether this is decorative (does not count toward scoring). */
  decorative: z.boolean().default(false),
  /** Default scarcity in scenario inventory. */
  defaultInventory: z.number().int().nonnegative().default(99),
  /** Display order in palette. */
  order: z.number().int().default(0),
  /** Iconic emoji used in palette (lightweight). */
  icon: z.string().default('block'),
});
export type BlockDef = z.infer<typeof BlockDefSchema>;

/** A placed block instance in the world. */
export const BlockInstanceSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({
    x: z.number().int(),
    y: z.number().int(),
    z: z.number().int(),
  }),
  rotation: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).default(0),
  /** Per-instance metadata (e.g. fluid level, temp). */
  metadata: z.record(z.unknown()).default({}),
});
export type BlockInstance = z.infer<typeof BlockInstanceSchema>;

/**
 * Top-level build state. The 3D builder, the simulation mode, and the
 * scoring engine all read from this same shape.
 */
export const BuildStateSchema = z.object({
  buildId: z.string().default(''),
  name: z.string().default('Untitled build'),
  scenarioId: z.string().default('free'),
  /** id -> instance */
  voxels: z.record(z.string(), BlockInstanceSchema).default({}),
  /** CellKey -> instance id (spatial index). */
  byCell: z.record(z.string(), z.string()).default({}),
  /** BlockType id -> count remaining in inventory. */
  inventory: z.record(z.string(), z.number().int().nonnegative()).default({}),
  /** Created/updated timestamps (ms epoch). */
  createdAt: z.number().default(0),
  updatedAt: z.number().default(0),
  /** Tag for sharing (e.g. encoded share token). */
  shareToken: z.string().optional(),
});
export type BuildState = z.infer<typeof BuildStateSchema>;

/** Returns a fresh, fully-defaulted BuildState. */
export function emptyState(): BuildState {
  const now = Date.now();
  return {
    buildId: '',
    name: 'Untitled build',
    scenarioId: 'free',
    voxels: {},
    byCell: {},
    inventory: {},
    createdAt: now,
    updatedAt: now,
  };
}
