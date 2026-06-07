'use client';

import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import { z } from 'zod';
import { BlockDefSchema } from '@/lib/blocks/types';
import { BLOCK_REGISTRY, replacePluginBlocks } from '@/lib/blocks/registry';
import { useBuildStore } from '@/lib/store/build-store';
import { ensureDatabaseReady, pluginStore } from '@/lib/persist/database';

const PLUGIN_ID = /^[a-z][a-z0-9-]{2,39}$/;

export const BlockPluginSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(PLUGIN_ID, 'Use 3-40 lowercase letters, numbers, or hyphens.'),
    name: z.string().min(1).max(80),
    version: z.string().min(1).max(30),
    author: z.string().min(1).max(80).optional(),
    blocks: z.array(BlockDefSchema).min(1).max(50),
  })
  .superRefine((plugin, ctx) => {
    const ids = new Set<string>();
    for (const [index, block] of plugin.blocks.entries()) {
      if (!block.id.startsWith(`${plugin.id}.`)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['blocks', index, 'id'],
          message: `Block ids must start with "${plugin.id}.".`,
        });
      }
      if (ids.has(block.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['blocks', index, 'id'],
          message: `Duplicate block id: ${block.id}`,
        });
      }
      ids.add(block.id);
    }
  });

export type BlockPlugin = z.infer<typeof BlockPluginSchema>;

export function parseBlockPlugin(input: unknown): BlockPlugin {
  return BlockPluginSchema.parse(input);
}

export function parseBlockPluginJson(json: string): BlockPlugin {
  if (json.length > 256_000) throw new Error('Plugin manifest exceeds the 256 KB limit.');
  let input: unknown;
  try {
    input = JSON.parse(json) as unknown;
  } catch {
    throw new Error('Plugin file is not valid JSON.');
  }
  return parseBlockPlugin(input);
}

interface BlockPluginState {
  plugins: BlockPlugin[];
  hydrated: boolean;
  revision: number;
  error: string | null;
  hydrate: () => Promise<void>;
  installJson: (json: string) => Promise<void>;
  remove: (pluginId: string) => Promise<void>;
  clearError: () => void;
}

export const useBlockPlugins = create<BlockPluginState>((update, read) => ({
  plugins: [],
  hydrated: false,
  revision: 0,
  error: null,
  hydrate: async () => {
    try {
      await ensureDatabaseReady();
      const stored = (await get<BlockPlugin[]>('installed', pluginStore)) ?? [];
      const plugins = stored.map((plugin) => parseBlockPlugin(plugin));
      activatePlugins(plugins);
      update((state) => ({ plugins, hydrated: true, error: null, revision: state.revision + 1 }));
    } catch (error) {
      update({ hydrated: true, error: errorMessage(error) });
    }
  },
  installJson: async (json) => {
    try {
      const plugin = parseBlockPluginJson(json);
      const current = read().plugins;
      const previous = current.find((item) => item.id === plugin.id);
      if (previous) await assertRemovedBlocksUnused(previous, plugin);
      const plugins = [...current.filter((item) => item.id !== plugin.id), plugin];
      validatePlugins(plugins);
      await ensureDatabaseReady();
      await set('installed', plugins, pluginStore);
      activatePlugins(plugins);
      update((state) => ({ plugins, error: null, revision: state.revision + 1 }));
    } catch (error) {
      update({ error: errorMessage(error) });
      throw error;
    }
  },
  remove: async (pluginId) => {
    try {
      const plugin = read().plugins.find((item) => item.id === pluginId);
      if (!plugin) return;
      await assertPluginUnused(plugin);
      const plugins = read().plugins.filter((item) => item.id !== pluginId);
      validatePlugins(plugins);
      await ensureDatabaseReady();
      await set('installed', plugins, pluginStore);
      activatePlugins(plugins);
      update((state) => ({ plugins, error: null, revision: state.revision + 1 }));
    } catch (error) {
      update({ error: errorMessage(error) });
      throw error;
    }
  },
  clearError: () => update({ error: null }),
}));

function activatePlugins(plugins: readonly BlockPlugin[]): void {
  const blocks = plugins.flatMap((plugin) => plugin.blocks);
  validatePlugins(plugins);
  replacePluginBlocks(blocks);
  const build = useBuildStore.getState();
  for (const block of blocks) {
    if (build.inventory[block.id] === undefined)
      build.incrementInventory(block.id, block.defaultInventory);
  }
}

function validatePlugins(plugins: readonly BlockPlugin[]): void {
  const pluginIds = new Set<string>();
  for (const plugin of plugins) {
    if (pluginIds.has(plugin.id)) throw new Error(`Duplicate plugin id: ${plugin.id}`);
    pluginIds.add(plugin.id);
  }
  const blocks = plugins.flatMap((plugin) => plugin.blocks);
  const builtInIds = new Set(BLOCK_REGISTRY.map((block) => block.id));
  const ids = new Set<string>();
  for (const block of blocks) {
    if (builtInIds.has(block.id))
      throw new Error(`Plugin block conflicts with built-in id: ${block.id}`);
    if (ids.has(block.id)) throw new Error(`Duplicate plugin block id: ${block.id}`);
    ids.add(block.id);
  }
}

async function assertPluginUnused(plugin: BlockPlugin): Promise<void> {
  const usedTypes = new Set(
    Object.values(useBuildStore.getState().voxels).map((block) => block.type),
  );
  const { listBuildsFromIDB } = await import('@/lib/persist');
  const savedBuilds = await listBuildsFromIDB();
  for (const build of savedBuilds) {
    for (const block of Object.values(build.snapshot.voxels)) usedTypes.add(block.type);
  }
  const used = plugin.blocks.find((block) => usedTypes.has(block.id));
  if (used)
    throw new Error(`Cannot remove ${plugin.name}; block ${used.id} is used by a local build.`);
}

async function assertRemovedBlocksUnused(previous: BlockPlugin, next: BlockPlugin): Promise<void> {
  const nextIds = new Set(next.blocks.map((block) => block.id));
  const removed = previous.blocks.filter((block) => !nextIds.has(block.id));
  if (removed.length === 0) return;
  await assertPluginUnused({ ...previous, blocks: removed });
}

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues.map((issue) => issue.message).join(' ');
  return error instanceof Error ? error.message : String(error);
}
