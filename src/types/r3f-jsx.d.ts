/**
 * React 19 RC types do not declare a global `JSX` namespace —
 * they use `React.JSX`. R3F 8 still augments the global namespace.
 * We re-declare a global `JSX` namespace (the way React 18 did) and
 * re-export every R3F intrinsic element so `tsc --noEmit` is happy.
 *
 * This file is intentionally a script (no imports, no exports) so
 * every consumer sees a single global `JSX.IntrinsicElements`.
 */

import type { ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
