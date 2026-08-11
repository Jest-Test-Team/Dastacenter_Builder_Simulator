/**
 * Test environment shims.
 *
 * jsdom allocates ArrayBuffers in its own V8 realm. Node 20's WebCrypto checks
 * its arguments with a cross-realm `instanceof`, so a buffer built inside jsdom
 * is rejected with "2nd argument is not instance of ArrayBuffer, Buffer,
 * TypedArray, or DataView" — even though it is one. Node 24+ relaxed the check,
 * which is why this reproduced only on CI's Node 20 and never locally.
 *
 * The production code is fine: browsers and workerd have a single realm. So the
 * shim lives here rather than pushing a test-only concern into src/. It copies
 * the bytes into a Buffer, which is a Node-realm Uint8Array, then delegates.
 */

import { webcrypto } from 'node:crypto';

const subtle = webcrypto.subtle;
const nativeDigest = subtle.digest.bind(subtle);

function toNodeRealm(data: BufferSource): Uint8Array {
  const view = ArrayBuffer.isView(data)
    ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    : new Uint8Array(data);
  // Buffer comes from Node's realm, so the instanceof check passes.
  return Buffer.from(view);
}

Object.defineProperty(globalThis.crypto, 'subtle', {
  configurable: true,
  value: new Proxy(subtle, {
    get(target, prop, receiver) {
      if (prop === 'digest') {
        return (algorithm: AlgorithmIdentifier, data: BufferSource) =>
          nativeDigest(algorithm, toNodeRealm(data));
      }
      return Reflect.get(target, prop, receiver);
    },
  }),
});
