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

/**
 * One verification check and its real outcome.
 *
 * `id` is the stable handle a localized renderer keys off; `name` and `detail`
 * stay English so a server log, a test assertion and a support ticket all read
 * the same regardless of who was looking at the screen.
 */
export type CredentialCheckId =
  | 'ownership'
  | 'binding'
  | 'backing'
  | 'circuit'
  | 'rulePack'
  | 'threshold'
  | 'disclosure';

export interface CredentialCheck {
  id: CredentialCheckId;
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
  | (BaseEvent & {
      stage: 'watch';
      chainId: number;
      /** Human-readable chain name, so a renderer need not re-look-it-up. */
      chainName: string;
      /** The address being watched. Carried structurally so a localized
       *  renderer never has to parse it back out of `line`. */
      holder: string;
      attempt: number;
      attempts: number;
    })
  | (BaseEvent & {
      stage: 'found';
      chainId: number;
      chainName: string;
      tokenId: string;
      certificates: number;
    })
  | (BaseEvent & { stage: 'read'; tokenId: string; level: string; metadataUri: string })
  | (BaseEvent & { stage: 'verify'; checks: CredentialCheck[] })
  | (BaseEvent & {
      stage: 'decide';
      level: string;
      amount: number;
      model: string;
      rationale: string;
      /**
       * True when the model was unreachable and `rationale` is the English
       * rate-card fallback rather than generated text. The renderer swaps in a
       * localized sentence instead of echoing English into a Chinese log.
       */
      rationaleFromModel: boolean;
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
