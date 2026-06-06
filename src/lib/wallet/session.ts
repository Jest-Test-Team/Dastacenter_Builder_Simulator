/**
 * Server-side session.
 *
 * Uses iron-session to encrypt the session JWT in an httpOnly cookie.
 * Stores { address, chain, issuedAt, walletKind: 'evm' | 'solana' }.
 */

import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  address?: string;
  chain?: string;
  walletKind?: 'evm' | 'solana';
  issuedAt?: number;
  csrf?: string;
}

const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ??
    'dev_only_secret_replace_with_32_char_random_xxxxxxxxxxxxxxxx',
  cookieName: 'dcb_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
