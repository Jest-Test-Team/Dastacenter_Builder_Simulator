/**
 * SIWS (Sign-In With Solana) helpers.
 *
 * Implementation of the de-facto SIWS message format:
 *   <domain> wants you to sign in with your Solana account:
 *   <address>
 *
 *   URI: <uri>
 *   Version: 1
 *   Chain: mainnet
 *   Nonce: <nonce>
 *   Issued At: <iso>
 *   Expiration Time: <iso>
 */

import nacl from 'tweetnacl';
import { decodeUTF8, decodeBase64 } from 'tweetnacl-util';
import bs58 from 'bs58';

export interface SiwsMessageFields {
  domain: string;
  address: string;
  uri: string;
  nonce: string;
  chain?: 'mainnet' | 'devnet' | 'testnet';
  statement?: string;
  issuedAt?: string;
  expirationTime?: string;
}

export function buildSiwsMessage(f: SiwsMessageFields): string {
  const chain = f.chain ?? 'mainnet';
  const issuedAt = f.issuedAt ?? new Date().toISOString();
  const header = `${f.domain} wants you to sign in with your Solana account:`;
  const body = [
    f.address,
    '',
    f.statement ?? 'Sign in to Datacenter Builder Simulator.',
    '',
    `URI: ${f.uri}`,
    'Version: 1',
    `Chain: ${chain}`,
    `Nonce: ${f.nonce}`,
    `Issued At: ${issuedAt}`,
    f.expirationTime ? `Expiration Time: ${f.expirationTime}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return `${header}\n${body}`;
}

/** Parse a SIWS message into its fields. */
export function parseSiwsMessage(message: string): SiwsMessageFields | null {
  const lines = message.split('\n');
  if (lines.length < 5) return null;
  const address = lines[1]?.trim();
  if (!address) return null;
  const get = (k: string) => lines.find((l) => l.startsWith(`${k}: `))?.split(': ')[1];
  return {
    domain: lines[0]?.replace(' wants you to sign in with your Solana account:', '') ?? '',
    address,
    uri: get('URI') ?? '',
    nonce: get('Nonce') ?? '',
    chain: (get('Chain') as 'mainnet' | 'devnet' | 'testnet' | undefined) ?? 'mainnet',
    statement: lines.slice(3, lines.findIndex((l) => l.startsWith('URI: '))).join('\n').trim(),
    issuedAt: get('Issued At'),
    expirationTime: get('Expiration Time'),
  };
}

/** Verify a Solana signature against a SIWS message. */
export function verifySiwsSignature(message: string, signatureBase64: string): boolean {
  try {
    const fields = parseSiwsMessage(message);
    if (!fields) return false;
    const msg = decodeUTF8(message);
    const sig = decodeBase64(signatureBase64);
    const pub = bs58.decode(fields.address);
    return nacl.sign.detached.verify(msg, sig, pub);
  } catch {
    return false;
  }
}
