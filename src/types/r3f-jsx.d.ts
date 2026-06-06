// React 19 RC types do not declare a global `JSX` namespace — they
// use `React.JSX`. R3F 8 still augments the global namespace, but
// TypeScript can be picky about how those augmentations propagate.
// This shim uses `declare module 'react'` to forcibly install
// IntrinsicElements on React.JSX, which is what the runtime
// actually checks.

import 'react';
import type { ThreeElements } from '@react-three/fiber';

declare module 'react' {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ThreeElements {}
  }
}
