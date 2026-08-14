/**
 * Build import accepts the two JSON shapes the app hands out.
 *
 * A regression guard: /demos/templates/[file] serves a *bare* BuildSnapshot,
 * while "Download your works" wraps the snapshot in { version, wallet, build }.
 * The importer must take both — a demo template downloaded from the app was
 * being rejected with "Invalid file format. Missing required fields." because it
 * had neither `version` nor `build`.
 */

import { describe, expect, it } from 'vitest';
import { importBuildFromFile } from '@/lib/export/build-import';
import type { BuildExportPayload } from '@/lib/export/build-export';
import { getDemoBuild } from '@/lib/demos';

// jsdom's File does not implement text(); importBuildFromFile only needs that.
function jsonFile(value: unknown): File {
  const text = JSON.stringify(value);
  return { name: 'build.json', text: async () => text } as unknown as File;
}

const demoSnapshot = getDemoBuild('greenfield-tier3')!.snapshot;

describe('importBuildFromFile', () => {
  it('imports a bare BuildSnapshot (a downloaded demo template)', async () => {
    const result = await importBuildFromFile(jsonFile(demoSnapshot));
    expect(result.success).toBe(true);
    expect(result.snapshot?.buildId).toBe(demoSnapshot.buildId);
    expect(Object.keys(result.snapshot?.voxels ?? {}).length).toBeGreaterThan(0);
    // No wallet in a template, so nothing to flag as a mismatch.
    expect(result.walletMismatch).toBeUndefined();
  });

  it('imports the wrapped export envelope from "Download your works"', async () => {
    const payload: BuildExportPayload = {
      version: 1,
      exportedAt: new Date(0).toISOString(),
      wallet: { address: '0xABCDEF0000000000000000000000000000000001' },
      build: demoSnapshot,
    };
    const result = await importBuildFromFile(jsonFile(payload), '0xabcdef0000000000000000000000000000000001');
    expect(result.success).toBe(true);
    expect(result.snapshot?.buildId).toBe(demoSnapshot.buildId);
    // Same wallet (case-insensitive) → not a mismatch.
    expect(result.walletMismatch).toBe(false);
  });

  it('flags a wallet mismatch on a wrapped payload from another wallet', async () => {
    const payload: BuildExportPayload = {
      version: 1,
      exportedAt: new Date(0).toISOString(),
      wallet: { address: '0x1111111111111111111111111111111111111111' },
      build: demoSnapshot,
    };
    const result = await importBuildFromFile(jsonFile(payload), '0x2222222222222222222222222222222222222222');
    expect(result.success).toBe(true);
    expect(result.walletMismatch).toBe(true);
  });

  it('rejects JSON that is neither shape', async () => {
    const result = await importBuildFromFile(jsonFile({ hello: 'world' }));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid/);
  });
});
