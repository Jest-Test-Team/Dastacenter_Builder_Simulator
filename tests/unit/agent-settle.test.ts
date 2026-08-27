/**
 * The settlement agent's central invariant.
 *
 * The demo's whole claim is that an autonomous agent paid a real dividend. That
 * claim is only worth anything if the agent is incapable of *appearing* to pay
 * one when it did not — so the property under test is the negative:
 *
 *   **No run reaches a `settled` event without a real transaction receipt.**
 *
 * Every failure path is driven here with no chain, no key and no treasury, and
 * each must terminate on `blocked` naming a true reason. If a future refactor
 * adds an optimistic "assume success" branch, these fail.
 *
 * (The generator is exercised under Node rather than workerd because the
 * locally-pinned workerd is older than the deploy target and cannot import
 * ethers — see the note in `tests/workers/agent-settle.test.ts`.)
 */

import { describe, expect, it } from 'vitest';
import { runSettlementAgent } from '@/lib/agent/settle';
import { isTerminal, type AgentEvent } from '@/lib/agent/types';

async function drain(address: string, chainId: number): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of runSettlementAgent({ address, chainId })) events.push(event);
  return events;
}

describe('runSettlementAgent', () => {
  it('halts on a malformed address instead of proceeding', async () => {
    const events = await drain('not-an-address', 11155111);
    const last = events.at(-1)!;
    expect(last.stage).toBe('blocked');
    expect(isTerminal(last)).toBe(true);
    if (last.stage === 'blocked') expect(last.reason).toMatch(/not a valid address/i);
  });

  it('halts on an unconfigured chain rather than inventing a payout', async () => {
    const events = await drain('0x1111111111111111111111111111111111111111', 999999);
    const last = events.at(-1)!;
    expect(last.stage).toBe('blocked');
    if (last.stage === 'blocked') expect(last.reason).toMatch(/chain 999999/);
  });

  it('never emits a settled event on any failing path', async () => {
    const runs = await Promise.all([
      drain('not-an-address', 11155111),
      drain('0x1111111111111111111111111111111111111111', 999999),
      drain('', 11155111),
    ]);
    for (const events of runs) {
      expect(events.some((event) => event.stage === 'settled')).toBe(false);
      expect(events.at(-1)!.stage).toBe('blocked');
    }
  });

  it('always terminates, and only on a terminal stage', async () => {
    const events = await drain('not-an-address', 11155111);
    expect(events.length).toBeGreaterThan(0);
    // Exactly one terminal event, and it is the last.
    expect(events.filter(isTerminal)).toHaveLength(1);
    expect(isTerminal(events.at(-1)!)).toBe(true);
  });

  it('stamps every event with a measured elapsed time and a renderable line', async () => {
    const events = await drain('not-an-address', 11155111);
    for (const event of events) {
      expect(typeof event.elapsedMs).toBe('number');
      expect(event.elapsedMs).toBeGreaterThanOrEqual(0);
      expect(event.line.length).toBeGreaterThan(0);
    }
  });
});
