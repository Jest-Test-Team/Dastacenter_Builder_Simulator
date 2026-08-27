#!/usr/bin/env node
/**
 * Gas balance monitor for the wallets that sign on the user's behalf.
 *
 * Two wallets can strand the demo by running dry, and both fail late and
 * opaquely — as a revert, mid-presentation:
 *
 *   1. The SBT minter on Polygon Amoy, which relays certificate mints.
 *   2. The KSN settlement agent on Sepolia, which pays the dividend. It also
 *      needs ETH for gas, and an agent that cannot pay is the one failure the
 *      whole closing beat rests on.
 *
 * Below THRESHOLD this raises a macOS notification (and opens the faucet).
 * Designed to be run from cron.
 *
 * Usage:
 *   node scripts/check-minter-balance.mjs
 *
 * Env (optional, falls back to the deployed values):
 *   MINTER_ADDRESS     - Amoy wallet to watch
 *   AMOY_RPC           - Amoy RPC endpoint
 *   MIN_POL            - Amoy threshold in POL (default 0.05)
 *   KSN_AGENT_ADDRESS  - Sepolia agent wallet; skipped entirely if unset
 *   SEPOLIA_RPC        - Sepolia RPC endpoint
 *   MIN_SEPOLIA_ETH    - Sepolia threshold in ETH (default 0.01)
 */

import { execFile } from 'node:child_process';

const ADDRESS = process.env.MINTER_ADDRESS || '0x556C7223e63159E9945E73dE36866eF0e3eea687';
const RPC = process.env.AMOY_RPC || 'https://rpc-amoy.polygon.technology';
const THRESHOLD = Number(process.env.MIN_POL || '0.05');
const FAUCET = 'https://faucet.polygon.technology/';

const AGENT_ADDRESS = process.env.KSN_AGENT_ADDRESS || '';
const SEPOLIA_RPC = process.env.SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com';
const MIN_SEPOLIA_ETH = Number(process.env.MIN_SEPOLIA_ETH || '0.01');
const SEPOLIA_FAUCET = 'https://sepoliafaucet.com/';

async function getBalance(addr, rpc) {
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [addr, 'latest'],
      id: 1,
    }),
  });
  const json = await res.json();
  if (!json.result) throw new Error('RPC error: ' + JSON.stringify(json));
  return Number(BigInt(json.result)) / 1e18;
}

function notify(title, message, openUrl) {
  // macOS notification via osascript; ignore errors on other platforms.
  const script = `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)} sound name "Submarine"`;
  execFile('osascript', ['-e', script], () => {});
  if (openUrl) execFile('open', [openUrl], () => {});
}

/** Check one wallet. Returns true when it is above its threshold. */
async function check({ label, address, rpc, threshold, unit, faucet }) {
  const balance = await getBalance(address, rpc);
  const stamp = new Date().toISOString();
  if (balance < threshold) {
    console.log(
      `[${stamp}] LOW: ${label} has ${balance.toFixed(5)} ${unit} < ${threshold} ${unit} — opening faucet`,
    );
    notify(`⚠️ ${label} low`, `${balance.toFixed(4)} ${unit} left. Claim from the faucet.`, faucet);
    return false;
  }
  console.log(`[${stamp}] OK: ${label} has ${balance.toFixed(5)} ${unit} (>= ${threshold} ${unit})`);
  return true;
}

(async () => {
  try {
    const wallets = [
      {
        label: 'SBT minter (Amoy)',
        address: ADDRESS,
        rpc: RPC,
        threshold: THRESHOLD,
        unit: 'POL',
        faucet: FAUCET,
      },
    ];

    // Only watched once the agent exists. Warning about an unconfigured wallet
    // every few hours is how a monitor gets ignored.
    if (AGENT_ADDRESS) {
      wallets.push({
        label: 'KSN agent (Sepolia)',
        address: AGENT_ADDRESS,
        rpc: SEPOLIA_RPC,
        threshold: MIN_SEPOLIA_ETH,
        unit: 'ETH',
        faucet: SEPOLIA_FAUCET,
      });
    }

    const results = await Promise.all(wallets.map(check));
    process.exit(results.every(Boolean) ? 0 : 1);
  } catch (err) {
    console.error('balance check failed:', err.message);
    process.exit(2);
  }
})();
