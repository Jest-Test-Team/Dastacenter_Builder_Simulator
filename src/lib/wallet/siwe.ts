/**
 * SIWE (Sign-In With Ethereum) helpers.
 *
 * The wallet signs a structured message. The server verifies the signature
 * and issues a JWT session cookie.
 */

import { SiweMessage } from 'siwe';

export function buildSiweMessage(params: {
  address: string;
  nonce: string;
  chainId: number;
  domain: string;
  uri: string;
  statement?: string;
  expirationTime?: string;
}): string {
  const message = new SiweMessage({
    domain: params.domain,
    address: params.address,
    statement: params.statement ?? 'Sign in to Datacenter Builder Simulator.',
    uri: params.uri,
    version: '1',
    chainId: params.chainId,
    nonce: params.nonce,
    issuedAt: new Date().toISOString(),
    expirationTime: params.expirationTime,
  });
  return message.prepareMessage();
}

export function verifySiweMessage(message: string, signature: string): Promise<{ address: string; nonce: string }> {
  return new SiweMessage(message).verify({ signature }).then((result) => {
    if (!result.success) throw new Error('SIWE verification failed');
    const parsed = new SiweMessage(message);
    return { address: parsed.address, nonce: parsed.nonce };
  });
}
