import { describe, it, expect } from 'vitest';
import { buildSiwsMessage, parseSiwsMessage, verifySiwsSignature } from '@/lib/wallet/siws';
import nacl from 'tweetnacl';
import { encodeBase64, decodeUTF8 } from 'tweetnacl-util';

describe('SIWS', () => {
  it('builds and parses a message', () => {
    const msg = buildSiwsMessage({
      domain: 'example.com',
      address: '11111111111111111111111111111111',
      uri: 'https://example.com',
      nonce: 'abc123',
    });
    const parsed = parseSiwsMessage(msg);
    expect(parsed?.domain).toBe('example.com');
    expect(parsed?.address).toBe('11111111111111111111111111111111');
    expect(parsed?.nonce).toBe('abc123');
  });

  it('verifies a valid ed25519 signature', () => {
    const kp = nacl.sign.keyPair();
    const pubkeyBase58 = encodeBase64(kp.publicKey);
    const address = btoa(pubkeyBase58).replace(/=/g, '');
    const msg = buildSiwsMessage({
      domain: 'example.com',
      address,
      uri: 'https://example.com',
      nonce: 'abc',
    });
    const sig = nacl.sign.detached(decodeUTF8(msg), kp.secretKey);
    const sigB64 = encodeBase64(sig);
    expect(verifySiwsSignature(msg, sigB64)).toBe(true);
  });

  it('rejects a tampered signature', () => {
    const kp = nacl.sign.keyPair();
    const pubkeyBase58 = encodeBase64(kp.publicKey);
    const address = btoa(pubkeyBase58).replace(/=/g, '');
    const msg = buildSiwsMessage({
      domain: 'example.com',
      address,
      uri: 'https://example.com',
      nonce: 'abc',
    });
    const sig = nacl.sign.detached(decodeUTF8(msg), kp.secretKey);
    const tampered = encodeBase64(sig).slice(0, -1) + 'A';
    expect(verifySiwsSignature(msg, tampered)).toBe(false);
  });
});
