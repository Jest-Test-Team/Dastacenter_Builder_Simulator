/**
 * The KSN autonomous settlement agent.
 *
 * Watches the chain for a credential, verifies it, decides a disbursement with a
 * language model, and pays a real ERC-20 dividend to the holder.
 *
 * The run is an async generator so the route can stream it and tests can drive
 * the identical code path with no network. Each `yield` happens **after** the
 * work it announces, so `elapsedMs` is a measurement and the terminal is a log.
 * The previous version of this panel walked four hard-coded strings on a 900 ms
 * timer; the project's own notes say a scripted console in a privacy demo is the
 * thing a reviewer should distrust, and they were right.
 *
 * Two invariants hold across every path:
 *
 * 1. **No `settled` without a transaction hash.** The only place a `settled`
 *    event is constructed is after `tx.wait()` returns a receipt. Everything
 *    else that stops the run emits `blocked` with the real reason.
 * 2. **The model never decides the amount.** It writes the rationale; the figure
 *    is re-derived from the published rate card. A hallucinated number cannot
 *    become a transfer.
 */

import { Contract, JsonRpcProvider, Wallet, getAddress, parseUnits } from 'ethers';
import { SBT_CONTRACT_ABI } from '@/lib/sbt/abi';
import { getSBTContractAddress } from '@/lib/sbt/client';
import { getChainConfig, getExplorerUrl, getRpcUrl } from '@/lib/sbt/chains';
import { resolveMetadataUri } from '@/lib/sbt/metadata';
import { AI_MODEL, complete, type ChatMessage } from '@/lib/ai/model';
import { verifyCredential, type FetchedCredential } from './credential';
import { rateFor } from './rate-card';
import type { AgentEvent, AgentStage, SettleRequest } from './types';

/**
 * `ownerOf` is not in `SBT_CONTRACT_ABI` — `src/lib/sbt/client.ts` supplies its
 * own fragment at the call site for the same reason. The agent needs it to
 * confirm the claimant really holds the token rather than trusting the address
 * in the request, so the fragment is appended here.
 */
const SBT_READ_ABI = [
  ...SBT_CONTRACT_ABI,
  'function ownerOf(uint256 tokenId) view returns (address)',
] as const;

/** Minimal ERC-20 surface. The agent only ever needs to read a balance and pay. */
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
] as const;

/**
 * ethers' `Contract` is indexed dynamically, so calls are typed as possibly
 * undefined. `src/lib/sbt/server.ts` handles this by intersecting the shape it
 * actually calls; the same pattern is used here rather than sprinkling `!`.
 */
type SbtReader = Contract & {
  getCertificates(owner: string): Promise<bigint[]>;
  tokenURI(tokenId: bigint): Promise<string>;
  getBlueprintHash(tokenId: bigint): Promise<string>;
  ownerOf(tokenId: bigint): Promise<string>;
};

type KsnToken = Contract & {
  balanceOf(owner: string): Promise<bigint>;
  decimals(): Promise<bigint>;
  transfer(to: string, amount: bigint): Promise<{ wait(): Promise<{ hash: string } | null> }>;
};

/** How long the agent watches before giving up, and how often it looks. */
const WATCH_ATTEMPTS = 8;
const WATCH_INTERVAL_MS = 2_000;

/**
 * The KSN token address for a chain.
 *
 * Mirrors `getSBTContractAddress`'s convention — `NEXT_PUBLIC_KSN_TOKEN_ADDRESS_
 * <NETWORK>`, uppercased with dashes as underscores — so the two contracts are
 * configured the same way instead of the token being a Sepolia-shaped special
 * case. That also makes the agent runnable against a local chain, which is how
 * the settlement path gets tested without spending testnet gas.
 */
export function ksnTokenAddress(chainId: number): string | null {
  const network = getChainConfig(chainId)?.network;
  if (!network) return null;
  const key = `NEXT_PUBLIC_KSN_TOKEN_ADDRESS_${network.toUpperCase().replace(/-/g, '_')}`;
  return process.env[key] || null;
}

function agentKey(): string | null {
  return process.env.KSN_AGENT_PRIVATE_KEY ?? null;
}

/** Is the agent able to settle at all? Surfaced so the UI can say so up front. */
export function agentConfigured(chainId: number): boolean {
  return Boolean(ksnTokenAddress(chainId) && agentKey());
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function* runSettlementAgent(request: SettleRequest): AsyncGenerator<AgentEvent> {
  const startedAt = Date.now();
  const since = () => Date.now() - startedAt;

  const blocked = (at: AgentStage, reason: string): AgentEvent => ({
    stage: 'blocked',
    at,
    reason,
    elapsedMs: since(),
    line: `HALTED at ${at}: ${reason}`,
  });

  let claimant: string;
  try {
    claimant = getAddress(request.address);
  } catch {
    yield blocked('watch', `${request.address} is not a valid address`);
    return;
  }

  const chain = getChainConfig(request.chainId);
  const rpcUrl = getRpcUrl(request.chainId);
  const sbtAddress = getSBTContractAddress(request.chainId);
  if (!chain || !rpcUrl || !sbtAddress) {
    yield blocked('watch', `No certificate contract is configured for chain ${request.chainId}`);
    return;
  }

  const provider = new JsonRpcProvider(rpcUrl, request.chainId);
  const sbt = new Contract(sbtAddress, SBT_READ_ABI, provider) as SbtReader;

  // ---------------------------------------------------------------- watch ---
  // Genuinely polls. If the architect mints while this is open, the agent picks
  // it up on the next pass — which is what "listening" has to mean if the word
  // is going to appear on screen.
  let tokenIds: bigint[] = [];
  for (let attempt = 1; attempt <= WATCH_ATTEMPTS; attempt++) {
    yield {
      stage: 'watch',
      chainId: request.chainId,
      attempt,
      elapsedMs: since(),
      line: `Watching ${chain.name} for KSN-recognised credentials held by ${claimant.slice(0, 10)}… (pass ${attempt}/${WATCH_ATTEMPTS})`,
    };
    try {
      tokenIds = await sbt.getCertificates(claimant);
    } catch (error) {
      yield blocked('watch', `Chain read failed: ${(error as Error).message}`);
      return;
    }
    if (tokenIds.length > 0) break;
    if (attempt < WATCH_ATTEMPTS) await wait(WATCH_INTERVAL_MS);
  }

  if (tokenIds.length === 0) {
    yield blocked('watch', `No certificate found for ${claimant} on ${chain.name}`);
    return;
  }

  // The newest credential is the one the architect just earned.
  const tokenId = tokenIds[tokenIds.length - 1]!;
  yield {
    stage: 'found',
    chainId: request.chainId,
    tokenId: tokenId.toString(),
    certificates: tokenIds.length,
    elapsedMs: since(),
    line: `Credential detected: token #${tokenId} of ${tokenIds.length} held on ${chain.name}.`,
  };

  // ----------------------------------------------------------------- read ---
  let credential: FetchedCredential;
  try {
    const [metadataUri, blueprintHash, owner] = await Promise.all([
      sbt.tokenURI(tokenId),
      sbt.getBlueprintHash(tokenId),
      sbt.ownerOf(tokenId),
    ]);
    const response = await fetch(resolveMetadataUri(metadataUri));
    credential = {
      tokenId: tokenId.toString(),
      owner,
      onChainBlueprintHash: blueprintHash,
      metadataUri,
      metadata: response.ok ? await response.json() : null,
    };
  } catch (error) {
    yield blocked('read', `Could not read the credential: ${(error as Error).message}`);
    return;
  }

  if (!credential.metadata) {
    yield blocked('read', 'Certificate metadata document could not be fetched');
    return;
  }

  // --------------------------------------------------------------- verify ---
  const verdict = verifyCredential(credential, claimant);
  yield {
    stage: 'read',
    tokenId: credential.tokenId,
    level: verdict.level,
    metadataUri: credential.metadataUri,
    elapsedMs: since(),
    line: `Read metadata: ${verdict.level} certification, commitment published, design withheld.`,
  };
  yield {
    stage: 'verify',
    checks: verdict.checks,
    elapsedMs: since(),
    line: verdict.ok
      ? `ZK credential verified — ${verdict.checks.length} checks passed, no commercial data disclosed.`
      : `Verification FAILED: ${verdict.reason}`,
  };

  // A failed check aborts. It never degrades into a warning that still pays.
  if (!verdict.ok) {
    yield blocked('verify', verdict.reason ?? 'Credential verification failed');
    return;
  }

  // --------------------------------------------------------------- decide ---
  // The figure comes from the rate card. The model supplies the reasoning, and
  // is told the amount rather than asked for it.
  const amount = rateFor(verdict.level);
  let rationale = `Rate card: ${verdict.level} pays ${amount} KSN per epoch.`;
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are the KSN settlement agent, disbursing a civilization dividend to the holder of a zero-knowledge facility credential.

The disbursement has ALREADY been computed from a published rate card. Your job is to state, in ONE sentence under 30 words, why this holder is entitled to it. Do not restate the amount. Do not claim to have verified anything yourself. Do not speculate about the facility's design — you have not been shown it, and that is the point.`,
      },
      {
        role: 'user',
        content: `Certification level: ${verdict.level}. Checks passed: ${verdict.checks
          .map((check) => check.name)
          .join(', ')}. The design itself was never disclosed.`,
      },
    ];
    rationale = (await complete(messages)).split('\n')[0]?.trim() || rationale;
  } catch {
    // The model is the narrator, not the decider. If Workers AI is unreachable
    // the dividend is still owed, so fall through with the rate-card sentence.
  }

  yield {
    stage: 'decide',
    level: verdict.level,
    amount,
    model: AI_MODEL,
    rationale,
    elapsedMs: since(),
    line: `Disbursement authorised: ${amount} KSN. ${rationale}`,
  };

  // --------------------------------------------------------------- settle ---
  const tokenAddress = ksnTokenAddress(request.chainId);
  const key = agentKey();
  if (!tokenAddress || !key) {
    yield blocked(
      'settle',
      'Agent treasury is not configured — deploy the KSN token and set KSN_AGENT_PRIVATE_KEY. No transfer was made.',
    );
    return;
  }

  yield {
    stage: 'settle',
    to: claimant,
    amount,
    elapsedMs: since(),
    line: `Signing dividend transfer of ${amount} KSN to ${claimant}…`,
  };

  try {
    const wallet = new Wallet(key, provider);
    const token = new Contract(tokenAddress, ERC20_ABI, wallet) as KsnToken;
    const decimals = Number(await token.decimals());
    const units = parseUnits(String(amount), decimals);

    // Check the treasury before signing, so an empty wallet reports itself
    // instead of surfacing as an opaque revert.
    const [treasury, gas] = await Promise.all([
      token.balanceOf(wallet.address),
      provider.getBalance(wallet.address),
    ]);
    if (treasury < units) {
      yield blocked('settle', `Agent treasury holds too few KSN to pay ${amount}`);
      return;
    }
    if (gas === 0n) {
      yield blocked(
        'settle',
        `Agent wallet ${wallet.address} has no ${chain.nativeCurrency?.symbol ?? 'ETH'} for gas`,
      );
      return;
    }

    const tx = await token.transfer(claimant, units);
    const receipt = await tx.wait();
    if (!receipt?.hash) {
      yield blocked('settle', 'Transfer produced no receipt');
      return;
    }

    yield {
      stage: 'settled',
      txHash: receipt.hash,
      explorerUrl: getExplorerUrl(request.chainId, receipt.hash, 'tx'),
      to: claimant,
      amount,
      elapsedMs: since(),
      line: `Transaction confirmed. ${amount} KSN disbursed — ${receipt.hash}`,
    };
  } catch (error) {
    yield blocked('settle', `Transfer failed: ${(error as Error).message}`);
  }
}
