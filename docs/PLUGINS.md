# Community block plugins

Block plugins are data-only JSON manifests. They cannot execute JavaScript or
load remote assets. Installed manifests are validated with Zod, stored in the
browser's IndexedDB, and activated in the palette, inventory, voxel renderer,
placement rules, scoring context, and simulation.

## Install

1. Open `/settings`.
2. Under **Community block plugins**, select **Install JSON**.
3. Choose a manifest no larger than 256 KB.

An example is available at `/examples/block-plugin.json`.

## Manifest contract

```json
{
  "schemaVersion": 1,
  "id": "example-solar",
  "name": "Example Solar Blocks",
  "version": "1.0.0",
  "author": "Optional author",
  "blocks": []
}
```

- `id` uses 3-40 lowercase letters, digits, or hyphens.
- Every block id must start with `<plugin-id>.`.
- A manifest contains 1-50 blocks.
- Built-in block ids cannot be replaced.
- Updating or removing a plugin is rejected when it would orphan a block used
  by the current build or any saved local build.
- Plugin definitions use the same `BlockDefSchema` as built-in blocks. See
  `src/lib/blocks/types.ts` for fields and validation constraints.

## Trust boundary

Descriptions, tags, citations, colors, and icons are rendered as escaped React
text or validated values. Plugins cannot provide HTML, shaders, scripts, URLs,
network requests, scoring code, or React components. A plugin can contribute
block metadata that existing generic rules read, but it cannot replace the
deterministic scoring rule pack.
