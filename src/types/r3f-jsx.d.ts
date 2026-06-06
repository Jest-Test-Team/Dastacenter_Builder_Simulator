// Ambient JSX augmentation for React 19 + R3F 8.
// React 19 types use React.JSX, but R3F 8 augments the global JSX namespace.
// Without this shim, every <mesh>, <group>, <boxGeometry> in TSX raises
// "Property 'X' does not exist on type 'JSX.IntrinsicElements'".

import type { ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

export {};
