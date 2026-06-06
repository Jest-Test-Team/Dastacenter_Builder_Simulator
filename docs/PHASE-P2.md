# Phase 2 — 3D builder (R3F)

## Goal
Deliver the 3d builder (r3f) work so the rest of the product can build on it.

## Files added
`components/builder/{BuilderCanvas,VoxelWorld,SiteEnvironment,PlacementPreview}.tsx`. R3F + drei + three.

## Key decisions
Frameloop='demand' by default — only re-renders on state change. DPR auto-detected. One InstancedMesh per block type keeps draw calls in single digits even with thousands of voxels.

## Verification
- `npm run typecheck` clean
- `npm run lint` clean (warnings ok)
- `npm test` green for any new unit tests
- Manual smoke: open the affected route in a fresh browser profile

## Next phase
[Phase 3](./PHASE-P3.md)
