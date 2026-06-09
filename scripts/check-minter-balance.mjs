#!/usr/bin/env node
/**
 * Minter wallet balance monitor for Polygon Amoy.
 *
 * Checks the SBT minter wallet's POL balance. If it is below THRESHOLD, it
 * raises a macOS notification (and opens the faucet) so you can top up before
 * a mint fails. Designed to be run from cron.
 *
 * Usage:
 *   node scripts/check-minter-balance.mjs
 *
 * Env (optional, falls back to the deployed values):
 *   MINTER_ADDRESS   - wallet to watch
 *   AMOY_RPC         - RPC endpoint
 *   MIN_POL          - threshold in POL (default 0.05)
 */

import { execFile } from 'node:child_process';

const ADDRESS = process.env.MINTER_ADDRESS || '0x556C7223e63159E9945E73dE36866eF0e3eea687';
const RPC = process.env.AMOY_RPC || 'https://rpc-amoy.polygon.technology';
const THRESHOLD = Number(process.env.MIN_POL || '0.05');
const FAUCET = 'https://faucet.polygon.technology/';

async function getBalancePol(addr) {
  const res = await fetch(RPC, {
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

(async () => {
  try {
    const pol = await getBalancePol(ADDRESS);
    const stamp = new Date().toISOString();
    if (pol < THRESHOLD) {
      console.log(`[${stamp}] LOW: ${pol.toFixed(5)} POL < ${THRESHOLD} POL — opening faucet`);
      notify('⚠️ Minter wallet low', `${pol.toFixed(4)} POL left. Claim from the faucet.`, FAUCET);
      process.exit(1);
    } else {
      console.log(`[${stamp}] OK: ${pol.toFixed(5)} POL (>= ${THRESHOLD} POL)`);
      process.exit(0);
    }
  } catch (err) {
    console.error('balance check failed:', err.message);
    process.exit(2);
  }
})();
