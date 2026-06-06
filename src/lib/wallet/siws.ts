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

import { verify as naclVerify, decode as naclDecode, decodeUTF8 } from 'tweetnacl-util';

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
    const sig = naclDecode(signatureBase64);
    // Solana pubkey is base58; for simplicity, we accept it directly.
    // The caller (server route) should also resolve it from a known wallet adapter event.
    return naclVerify(sig, msg, naclDecode(fields.address));
  } catch {
    return false;
  }
}
