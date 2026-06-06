import { describe, it, expect } from 'vitest';
import { encodeBuildToShareToken, decodeShareToken, buildShareUrl } from '@/lib/persist/share';
import { emptyState, placeBlock, type BuildState } from '@/lib/blocks';

describe('share tokens', () => {
  it('round-trips a state', async () => {
    const s: BuildState = emptyState();
    placeBlock(s, { typeId: 'server_rack', cell: { x: 4, y: 1, z: 4 } });
    const token = await encodeBuildToShareToken(s);
    expect(token).toMatch(/^v1\./);
    const back = await decodeShareToken(token);
    expect(back).toBeTruthy();
    expect(Object.keys(back!.voxels).length).toBe(1);
  });

  it('builds an absolute URL', async () => {
    const s = emptyState();
    // share util takes the full BuildSnapshot (with UI fields); we cast since the test only exercises persistence shape
    const url = await buildShareUrl(s as unknown as Parameters<typeof buildShareUrl>[0], 'https://example.com', '/build/free');
    expect(url).toMatch(/^https:\/\/example\.com\/build\/free\?share=v1\./);
  });

  it('rejects malformed tokens', async () => {
    expect(await decodeShareToken('garbage')).toBeNull();
    expect(await decodeShareToken('v1.lz.not-base64!')).toBeNull();
  });
});
