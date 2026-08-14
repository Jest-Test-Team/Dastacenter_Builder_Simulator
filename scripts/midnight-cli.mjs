#!/usr/bin/env node
/**
 * Midnight Preview CLI — deploy the certificate contract and mint on-chain.
 *
 * This is the headless counterpart to the browser flow. It uses the installed
 * midnight-js SDK (kept out of the Next bundle) against a local proof server and
 * the Preview indexer/node. Run it with a funded Preview wallet seed.
 *
 * Subcommands:
 *   smoke   — import the SDK, load the compiled keys, ping the proof server.
 *             Verifies the toolchain end of the pipeline with no wallet/funds.
 *   deploy  — deploy circuits/build to Preview; prints the contract address.
 *   mint    — call mintCertificate on the deployed contract.
 *
 * Env:
 *   MIDNIGHT_PROOF_SERVER_URL   (default http://127.0.0.1:6300)
 *   MIDNIGHT_INDEXER_URL, MIDNIGHT_INDEXER_WS_URL, MIDNIGHT_NODE_URL
 *   MIDNIGHT_NETWORK            (default preview)
 *   MIDNIGHT_WALLET_SEED        (hex; required for deploy/mint)
 *   MIDNIGHT_CERT_CONTRACT_ADDRESS (required for mint)
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT, 'circuits/build');
const PROOF_URL = process.env.MIDNIGHT_PROOF_SERVER_URL ?? 'http://127.0.0.1:6300';
const NETWORK = process.env.MIDNIGHT_NETWORK ?? 'preview';

// Public Preview endpoints (docs.midnight.network/relnotes/network). Overridable.
const INDEXER_URL =
  process.env.MIDNIGHT_INDEXER_URL ?? 'https://indexer.preview.midnight.network/api/v4/graphql';
const INDEXER_WS_URL =
  process.env.MIDNIGHT_INDEXER_WS_URL ?? INDEXER_URL.replace(/^http/, 'ws').replace(/\/graphql$/, '/graphql/ws');
const NODE_URL = process.env.MIDNIGHT_NODE_URL ?? 'https://rpc.preview.midnight.network';

/**
 * Reads the wallet seed WITHOUT it appearing in shell history or command args:
 * from the gitignored file `.midnight/seed` (preferred) or MIDNIGHT_WALLET_SEED.
 * Testnet seed only — never a mainnet seed.
 */
function readSeedRaw() {
  const file = path.join(ROOT, '.midnight/seed');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  return process.env.MIDNIGHT_WALLET_SEED?.trim() ?? '';
}

/**
 * Resolves the raw content to the hex seed WalletBuilder expects. Accepts:
 *  - a hex seed (32 or 64 bytes) → used as-is;
 *  - a BIP39 mnemonic (space-separated words) → converted to the BIP32 seed hex.
 * If the derivation does not match your wallet, `address` will show a different
 * mn_addr — that is the signal to export the hex seed from the wallet instead.
 */
async function resolveSeedHex() {
  const raw = readSeedRaw();
  if (!raw) return '';
  if (/\s/.test(raw)) {
    const bip39 = await import('bip39');
    return Buffer.from(bip39.mnemonicToSeedSync(raw)).toString('hex');
  }
  return raw.replace(/^0x/, '');
}

const log = (...a) => console.log('·', ...a);
const die = (m) => {
  console.error('xx', m);
  process.exit(1);
};

async function pingProofServer() {
  const res = await fetch(`${PROOF_URL}/health`).catch(() => null);
  if (!res || !res.ok) die(`Proof server not reachable at ${PROOF_URL} (start it: ./scripts/midnight-setup.sh serve)`);
  const version = await fetch(`${PROOF_URL}/version`).then((r) => r.text()).catch(() => 'unknown');
  log(`Proof server OK at ${PROOF_URL} (version ${version.trim()})`);
}

async function loadContract() {
  const entry = path.join(BUILD_DIR, 'contract/index.js');
  if (!existsSync(entry)) die('circuits/build missing — run `npm run zk:compile`.');
  const mod = await import(entry);
  return mod;
}

async function smoke() {
  log(`Network: ${NETWORK}`);
  await pingProofServer();

  // Compiled contract + local keys.
  const contractMod = await loadContract();
  log(`Compiled contract loaded: exports ${Object.keys(contractMod).slice(0, 8).join(', ')}…`);

  const { NodeZkConfigProvider } = await import('@midnight-ntwrk/midnight-js-node-zk-config-provider');
  const zk = new NodeZkConfigProvider(BUILD_DIR);
  for (const circuit of ['proveThreshold', 'mintCertificate']) {
    const key = await zk.getProverKey(circuit);
    log(`prover key '${circuit}': ${key?.length ?? '?'} bytes`);
  }

  const { httpClientProofProvider } = await import('@midnight-ntwrk/midnight-js-http-client-proof-provider');
  const proof = httpClientProofProvider(PROOF_URL, zk);
  log(`Proof provider constructed: ${typeof proof.proveTx === 'function' ? 'proveTx ready' : 'no proveTx'}`);

  log('SMOKE OK — SDK imports, compiled keys load, and the proof server is reachable.');
  log('Next: set MIDNIGHT_WALLET_SEED (+ indexer/node URLs) and run `deploy`.');
}

function requireWalletEnv() {
  if (!readSeedRaw())
    die('No wallet seed. Put the hex seed (or 24-word phrase) in .midnight/seed (gitignored). Testnet only.');
}

/** Builds just the headless wallet from the seed (what `address` needs). */
async function buildWallet() {
  const { setNetworkId } = await import('@midnight-ntwrk/midnight-js-network-id');
  setNetworkId(NETWORK); // midnight-js uses the string id ('preview').

  // The wallet (zswap) network-id is an enum: Preview is a TestNet. This is a
  // separate id system from midnight-js's string above.
  const { NetworkId } = await import('@midnight-ntwrk/zswap');
  const walletNetworkId = NETWORK === 'mainnet' ? NetworkId.MainNet
    : NETWORK === 'undeployed' ? NetworkId.Undeployed
    : NetworkId.TestNet;

  const { WalletBuilder } = await import('@midnight-ntwrk/wallet');
  const wallet = await WalletBuilder.buildFromSeed(
    INDEXER_URL,
    INDEXER_WS_URL,
    PROOF_URL,
    NODE_URL,
    await resolveSeedHex(),
    walletNetworkId,
  );
  wallet.start();
  log('Wallet built; syncing with the indexer…');
  return wallet;
}

/**
 * Waits for the wallet to sync far enough to have spendable coins (or a state
 * we can read the address from). Returns the latest state. `wantFunds` waits for
 * a non-empty balance; otherwise it returns after the first meaningful state.
 */
async function waitForWallet(wallet, { wantFunds = false, timeoutMs = 180_000 } = {}) {
  const { firstValueFrom, filter, timeout } = await import('rxjs');
  const ready = (s) =>
    wantFunds ? Object.keys(s.balances ?? {}).length > 0 : Boolean(s.address);
  try {
    return await firstValueFrom(wallet.state().pipe(filter(ready), timeout(timeoutMs)));
  } catch {
    // Fall back to whatever the current first state is (may be unsynced).
    return await firstValueFrom(wallet.state());
  }
}

async function buildProviders({ wantFunds = false } = {}) {
  const { NodeZkConfigProvider } = await import('@midnight-ntwrk/midnight-js-node-zk-config-provider');
  const { httpClientProofProvider } = await import('@midnight-ntwrk/midnight-js-http-client-proof-provider');
  const { indexerPublicDataProvider } = await import('@midnight-ntwrk/midnight-js-indexer-public-data-provider');
  const { levelPrivateStateProvider } = await import('@midnight-ntwrk/midnight-js-level-private-state-provider');

  const wallet = await buildWallet();
  if (wantFunds) log('Syncing wallet — waiting for the funded balance to appear…');
  const state = await waitForWallet(wallet, { wantFunds });
  log(`Wallet address: ${state.address}`);
  log(`balances: ${JSON.stringify(state.balances ?? {}, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))}`);

  const zkConfigProvider = new NodeZkConfigProvider(BUILD_DIR);
  const proofProvider = httpClientProofProvider(PROOF_URL, zkConfigProvider);
  const publicDataProvider = indexerPublicDataProvider(INDEXER_URL, INDEXER_WS_URL);
  const password = process.env.MIDNIGHT_STATE_PASSWORD ?? 'datacenter-cert-dev-password-0001';
  const privateStateProvider = levelPrivateStateProvider({
    privateStateStoreName: 'datacenter-cert',
    signingKeyStoreName: 'datacenter-cert-keys',
    privateStoragePasswordProvider: () => password,
    accountId: state.address, // scope storage to this wallet
  });

  return { zkConfigProvider, proofProvider, publicDataProvider, privateStateProvider, wallet };
}

/**
 * Builds the wallet from the seed and prints its address + balances — read-only,
 * no transaction. Use this to CONFIRM the derived address matches your wallet
 * (mn_addr_preview1fk…) before deploying. A mismatch means the seed/derivation
 * is wrong; export the hex seed from the wallet instead of the phrase.
 */
/**
 * Generates a FRESH wallet the CLI fully controls (random 32-byte hex seed) and
 * saves it to .midnight/seed. Avoids the known-hard problem of reproducing a
 * Lace/1AM address from its recovery phrase: this seed matches buildFromSeed by
 * construction. Fund the printed address from your 1AM wallet, then deploy.
 */
async function newWallet() {
  const dir = path.join(ROOT, '.midnight');
  const seedFile = path.join(dir, 'seed');
  if (existsSync(seedFile)) die(`.midnight/seed already exists — remove it first if you really want a new wallet.`);
  const { randomBytes } = await import('node:crypto');
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const seed = randomBytes(32).toString('hex');
  mkdirSync(dir, { recursive: true });
  writeFileSync(seedFile, seed, { mode: 0o600 });
  log('Fresh testnet seed written to .midnight/seed (gitignored, 0600).');
  await address(); // print the address to fund
}

async function address() {
  requireWalletEnv();
  const wallet = await buildWallet();
  log('Waiting for wallet to sync (up to ~2 min for a funded balance)…');
  const state = await waitForWallet(wallet, { wantFunds: true, timeoutMs: 120_000 });
  log(`address (shielded)      : ${state.address}`);
  log(`addressLegacy (raw)     : ${state.addressLegacy}`);

  // Encode the unshielded (legacy) address to bech32 so it can be pasted into a
  // wallet's Send field. Try a few network tags — the wallet SDK's zswap layer
  // tags addresses "test" while the current Preview wallet uses "preview".
  try {
    const { UnshieldedAddress } = await import('@midnight-ntwrk/wallet-sdk-address-format');
    const rawHex = String(state.addressLegacy).split('|')[0].replace(/^0x/, '');
    const addr = new UnshieldedAddress(Buffer.from(rawHex, 'hex'));
    for (const tag of ['preview', 'test', 'testnet']) {
      try {
        const bech = UnshieldedAddress.codec.encode(tag, addr).toString();
        log(`unshielded bech32 [${tag}] : ${bech}`);
      } catch (e) {
        log(`unshielded bech32 [${tag}] : (encode failed: ${e.message})`);
      }
    }
    log('  ^ FUND the one whose network tag matches your 1AM wallet with unshielded NIGHT.');
  } catch (e) {
    log(`bech32 encoding unavailable: ${e.message}`);
  }

  log(`coinPublicKey           : ${state.coinPublicKey ?? '?'}`);
  log(`balances                : ${JSON.stringify(state.balances ?? {}, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))}`);
  await wallet.close?.();
  process.exit(0);
}

async function deploy() {
  await pingProofServer();
  requireWalletEnv();
  const { Contract } = await loadContract();
  const providers = await buildProviders({ wantFunds: true });
  const { deployContract } = await import('@midnight-ntwrk/midnight-js-contracts');

  log('Deploying certificate contract to Preview…');
  const deployed = await deployContract(
    {
      ...providers,
      walletProvider: providers.wallet,
      midnightProvider: providers.wallet,
    },
    { contract: new Contract({}), privateStateId: 'datacenter-cert', initialPrivateState: {} },
  );
  const address = deployed.deployTxData.public.contractAddress;
  log(`DEPLOYED. Contract address:\n  ${address}`);
  log('Set NEXT_PUBLIC_MIDNIGHT_CERT_CONTRACT_ADDRESS to this and redeploy the app.');
  process.exit(0);
}

async function mint() {
  await pingProofServer();
  requireWalletEnv();
  const address = process.env.MIDNIGHT_CERT_CONTRACT_ADDRESS;
  if (!address) die('MIDNIGHT_CERT_CONTRACT_ADDRESS is required for mint.');
  const { Contract } = await loadContract();
  const providers = await buildProviders({ wantFunds: true });
  const { findDeployedContract } = await import('@midnight-ntwrk/midnight-js-contracts');

  const found = await findDeployedContract(
    { ...providers, walletProvider: providers.wallet, midnightProvider: providers.wallet },
    { contractAddress: address, contract: new Contract({}), privateStateId: 'datacenter-cert', initialPrivateState: {} },
  );
  log('Calling mintCertificate on-chain…');
  const threshold = Number(process.env.MIDNIGHT_THRESHOLD ?? 85);
  const packVersion = new Uint8Array(32); // set to the rule-pack bytes in real use
  const res = await found.callTx.mintCertificate(threshold, packVersion);
  log(`MINTED. txId=${res.public.txId} block=${res.public.blockHeight ?? '?'}`);
  process.exit(0);
}

const cmd = process.argv[2] ?? 'smoke';
const run = { smoke, 'new-wallet': newWallet, address, deploy, mint }[cmd];
if (!run) die(`Unknown command '${cmd}'. Use: smoke | new-wallet | address | deploy | mint`);
run().catch((err) => {
  console.error('xx', err?.message ?? err);
  process.exit(1);
});
