import { afterEach, describe, expect, it } from 'vitest';
import { getBlock, getBlocksByCategory, replacePluginBlocks } from '@/lib/blocks';
import { parseBlockPlugin, parseBlockPluginJson } from '@/lib/plugins/block-plugins';

const validPlugin = {
  schemaVersion: 1 as const,
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  blocks: [
    {
      id: 'test-plugin.flywheel',
      category: 'power' as const,
      displayName: 'Flywheel UPS',
      description: 'A test flywheel block.',
      size: [1, 1, 1] as [number, number, number],
      color: '#123456',
    },
  ],
};

afterEach(() => replacePluginBlocks([]));

describe('block plugin API', () => {
  it('parses and defaults a valid namespaced manifest', () => {
    const plugin = parseBlockPlugin(validPlugin);
    expect(plugin.blocks[0]?.defaultInventory).toBe(99);
    expect(plugin.blocks[0]?.ports).toEqual([]);
  });

  it('rejects malformed JSON', () => {
    expect(() => parseBlockPluginJson('{nope')).toThrow('not valid JSON');
  });

  it('rejects oversized manifests', () => {
    expect(() => parseBlockPluginJson(' '.repeat(256_001))).toThrow('256 KB');
  });

  it('rejects block ids outside the plugin namespace', () => {
    expect(() =>
      parseBlockPlugin({
        ...validPlugin,
        blocks: [{ ...validPlugin.blocks[0], id: 'other.flywheel' }],
      }),
    ).toThrow('must start');
  });

  it('activates plugin blocks in lookup and category queries', () => {
    const plugin = parseBlockPlugin(validPlugin);
    replacePluginBlocks(plugin.blocks);
    expect(getBlock('test-plugin.flywheel')?.displayName).toBe('Flywheel UPS');
    expect(getBlocksByCategory('power').some((block) => block.id === 'test-plugin.flywheel')).toBe(
      true,
    );
  });

  it('protects built-in block ids from replacement', () => {
    const plugin = parseBlockPlugin(validPlugin);
    expect(() => replacePluginBlocks([{ ...plugin.blocks[0]!, id: 'server_rack' }])).toThrow(
      'built-in id',
    );
  });
});
