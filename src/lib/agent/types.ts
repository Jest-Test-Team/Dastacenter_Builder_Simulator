/**
 * The KSN settlement agent's event stream.
 *
 * The agent's whole credibility rests on one property: **every event is emitted
 * after the work it describes has actually happened.** No event is scheduled, no
 * line is on a timer, and `elapsedMs` is measured, not chosen. The terminal that
 * renders these is therefore a log, not an animation — which is the difference
 * between a demo a reviewer trusts and one they open the network tab on.
 *
 * The union is closed and the terminal renders from it exhaustively, so a new
 * stage cannot be added without deciding how it reads on screen.
 */

export type AgentStage =
  | 'watch'
  | 'found'
  | 'read'
  | 'verify'
  | 'decide'
  | 'settle'
  | 'settled'
  | 'blocked';

/** One verification check and its real outcome. */
export interface CredentialCheck {
  name: string;
  ok: boolean;
  detail: string;
}

interface BaseEvent {
  /** Milliseconds since the run began. Measured. */
  elapsedMs: number;
  /** The line as it appears in the terminal. */
  line: string;
}

export type AgentEvent =
  | (BaseEvent & { stage: 'watch'; chainId: number; attempt: number })
  | (BaseEvent & { stage: 'found'; chainId: number; tokenId: string; certificates: number })
  | (BaseEvent & { stage: 'read'; tokenId: string; level: string; metadataUri: string })
  | (BaseEvent & { stage: 'verify'; checks: CredentialCheck[] })
  | (BaseEvent & {
      stage: 'decide';
      level: string;
      amount: number;
      model: string;
      rationale: string;
    })
  | (BaseEvent & { stage: 'settle'; to: string; amount: number })
  | (BaseEvent & {
      stage: 'settled';
      /** Always present. A settled event without a real hash is unrepresentable. */
      txHash: string;
      explorerUrl: string;
      to: string;
      amount: number;
    })
  | (BaseEvent & { stage: 'blocked'; at: AgentStage; reason: string });

/** Terminal states. The stream always ends on one of these. */
export function isTerminal(event: AgentEvent): boolean {
  return event.stage === 'settled' || event.stage === 'blocked';
}

export interface SettleRequest {
  /** The architect's wallet — the credential holder and the payee. */
  address: string;
  chainId: number;
}
