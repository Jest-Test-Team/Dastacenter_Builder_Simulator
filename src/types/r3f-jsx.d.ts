/**
 * React Three Fiber auto-augments JSX.IntrinsicElements at the type
 * level. This shim exists because we are pinned to the React 19 RC
 * types, which sometimes drop the merge. If the actual R3F types are
 * picked up, this file is a no-op (it just re-declares the same
 * intrinsics in a way that is a structural subtype).
 */

import type { ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

export {};
