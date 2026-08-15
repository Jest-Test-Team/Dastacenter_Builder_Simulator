/**
 * Shared Midnight wallet connection — a single source of truth.
 *
 * The connection used to live in each `MidnightWalletBadge`'s local state, so a
 * connect in the modal never reached the header or the mint flow, and reopening
 * the modal lost it. This zustand store hoists it to app scope: connect once and
 * the address, brand and unshielded-NIGHT balance show everywhere, and the mint
 * reuses the live `ConnectedAPI` instead of prompting again.
 *
 * The live `api` is kept in memory only (it can't be serialised), so there is no
 * auto-reconnect across reloads — connecting prompts the wallet, which we only
 * do on an explicit user action.
 */

'use client';

import { create } from 'zustand';
import { connectMidnightWallet, type ConnectedAPI } from './wallet';

interface MidnightWalletStore {
  /** Live connection — present only after a successful connect this session. */
  api: ConnectedAPI | null;
  walletId: string | null;
  walletLabel: string | null;
  address: string | null;
  coinPublicKey: string | null;
  unshieldedNight: string | null;
  connectedAt: number | null;

  connecting: string | null; // walletId currently connecting, or null
  error: string | null;

  isConnected: () => boolean;
  connect: (walletId?: string) => Promise<void>;
  /** Re-read balance/address from the live wallet (no new prompt). */
  refresh: () => Promise<void>;
  disconnect: () => void;
}

export const useMidnightWallet = create<MidnightWalletStore>((set, get) => ({
  api: null,
  walletId: null,
  walletLabel: null,
  address: null,
  coinPublicKey: null,
  unshieldedNight: null,
  connectedAt: null,
  connecting: null,
  error: null,

  isConnected: () => get().api !== null,

  connect: async (walletId?: string) => {
    set({ connecting: walletId ?? 'default', error: null });
    try {
      const w = await connectMidnightWallet(walletId);
      set({
        api: w.api,
        walletId: w.walletId,
        walletLabel: w.walletLabel,
        address: w.address,
        coinPublicKey: w.coinPublicKey,
        unshieldedNight: w.unshieldedNight,
        connectedAt: Date.now(),
        connecting: null,
        error: null,
      });
    } catch (err) {
      set({
        connecting: null,
        error: err instanceof Error ? err.message : 'Failed to connect Midnight wallet',
      });
      throw err;
    }
  },

  refresh: async () => {
    const { api } = get();
    if (!api) return;
    try {
      const [{ unshieldedAddress }, balances] = await Promise.all([
        api.getUnshieldedAddress(),
        api.getUnshieldedBalances(),
      ]);
      const { sumUnshieldedNight } = await import('./wallet');
      set({ address: unshieldedAddress, unshieldedNight: sumUnshieldedNight(balances) });
    } catch {
      /* keep the last-known values if a refresh fails */
    }
  },

  disconnect: () =>
    set({
      api: null,
      walletId: null,
      walletLabel: null,
      address: null,
      coinPublicKey: null,
      unshieldedNight: null,
      connectedAt: null,
      error: null,
    }),
}));
