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
import { existsSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT, 'circuits/build');
const PROOF_URL = process.env.MIDNIGHT_PROOF_SERVER_URL ?? 'http://127.0.0.1:6300';
const NETWORK = process.env.MIDNIGHT_NETWORK ?? 'preview';

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

async function requireWalletEnv() {
  if (!process.env.MIDNIGHT_WALLET_SEED) die('MIDNIGHT_WALLET_SEED is required (funded Preview wallet).');
  if (!process.env.MIDNIGHT_INDEXER_URL || !process.env.MIDNIGHT_NODE_URL)
    die('MIDNIGHT_INDEXER_URL + MIDNIGHT_NODE_URL are required for on-chain actions.');
}

async function buildProviders() {
  // Assembled here so `smoke` needs none of it. Uses the documented provider set.
  const { setNetworkId } = await import('@midnight-ntwrk/midnight-js-network-id');
  setNetworkId(NETWORK);

  const { NodeZkConfigProvider } = await import('@midnight-ntwrk/midnight-js-node-zk-config-provider');
  const { httpClientProofProvider } = await import('@midnight-ntwrk/midnight-js-http-client-proof-provider');
  const { indexerPublicDataProvider } = await import('@midnight-ntwrk/midnight-js-indexer-public-data-provider');
  const { levelPrivateStateProvider } = await import('@midnight-ntwrk/midnight-js-level-private-state-provider');

  const zkConfigProvider = new NodeZkConfigProvider(BUILD_DIR);
  const proofProvider = httpClientProofProvider(PROOF_URL, zkConfigProvider);
  const publicDataProvider = indexerPublicDataProvider(
    process.env.MIDNIGHT_INDEXER_URL,
    process.env.MIDNIGHT_INDEXER_WS_URL ?? process.env.MIDNIGHT_INDEXER_URL.replace(/^http/, 'ws'),
  );
  const privateStateProvider = levelPrivateStateProvider({ privateStateStoreName: 'datacenter-cert' });

  // A headless wallet from the seed provides balanceTx/submitTx + coin key.
  const { WalletBuilder } = await import('@midnight-ntwrk/wallet');
  const wallet = await WalletBuilder.buildFromSeed(
    process.env.MIDNIGHT_INDEXER_URL,
    process.env.MIDNIGHT_INDEXER_WS_URL ?? process.env.MIDNIGHT_INDEXER_URL.replace(/^http/, 'ws'),
    PROOF_URL,
    process.env.MIDNIGHT_NODE_URL,
    process.env.MIDNIGHT_WALLET_SEED,
    NETWORK,
  );
  wallet.start();

  return { zkConfigProvider, proofProvider, publicDataProvider, privateStateProvider, wallet };
}

async function deploy() {
  await pingProofServer();
  await requireWalletEnv();
  const { Contract } = await loadContract();
  const providers = await buildProviders();
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
  await requireWalletEnv();
  const address = process.env.MIDNIGHT_CERT_CONTRACT_ADDRESS;
  if (!address) die('MIDNIGHT_CERT_CONTRACT_ADDRESS is required for mint.');
  const { Contract } = await loadContract();
  const providers = await buildProviders();
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
const run = { smoke, deploy, mint }[cmd];
if (!run) die(`Unknown command '${cmd}'. Use: smoke | deploy | mint`);
run().catch((err) => {
  console.error('xx', err?.message ?? err);
  process.exit(1);
});
