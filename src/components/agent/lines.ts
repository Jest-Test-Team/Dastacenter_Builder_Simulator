/**
 * Rendering agent events as localized terminal lines.
 *
 * The agent emits a canonical English `line` alongside the structured fields of
 * every event. That string is what tests assert on and what a server log would
 * keep, so it stays; this renders the same event in the reader's language from
 * those fields instead, falling back to `line` for anything unhandled.
 *
 * Doing it client-side rather than passing a locale to the API keeps the API
 * contract language-free — a log that changes shape with an Accept-Language
 * header is a log that is hard to grep — and means adding a locale never
 * touches the agent.
 */

import type { TFunction } from '@/lib/i18n';
import type { AgentEvent, CredentialCheck } from '@/lib/agent/types';

/** Addresses are long and the terminal is narrow; the head is enough to match on. */
function short(address: string): string {
  return `${address.slice(0, 10)}…`;
}

/** The check's name in the reader's language, keyed by its stable id. */
export function checkName(check: CredentialCheck, t: TFunction): string {
  const localized = t(`agent.check.${check.id}`);
  return localized === `agent.check.${check.id}` ? check.name : localized;
}

export function agentLine(event: AgentEvent, t: TFunction): string {
  switch (event.stage) {
    case 'watch':
      return t('agent.line.watch', {
        chain: event.chainName,
        address: short(event.holder),
        attempt: event.attempt,
        attempts: event.attempts,
      });
    case 'found':
      return t('agent.line.found', {
        tokenId: event.tokenId,
        count: event.certificates,
        chain: event.chainName,
      });
    case 'read':
      return t('agent.line.read', { level: event.level });
    case 'verify': {
      const failed = event.checks.find((check) => !check.ok);
      return failed
        ? t('agent.line.verifyFailed', { reason: failed.detail })
        : t('agent.line.verified', { count: event.checks.length });
    }
    case 'decide':
      // Echoing the English rate-card fallback into a Chinese log reads as a
      // bug, so an ungenerated rationale gets a localized sentence instead.
      return event.rationaleFromModel
        ? t('agent.line.decide', {
            amount: event.amount.toLocaleString(),
            rationale: event.rationale,
          })
        : t('agent.line.decideRateCard', {
            amount: event.amount.toLocaleString(),
            level: event.level,
          });
    case 'settle':
      return t('agent.line.settle', {
        amount: event.amount.toLocaleString(),
        address: short(event.to),
      });
    case 'settled':
      return t('agent.line.settled', {
        amount: event.amount.toLocaleString(),
        txHash: event.txHash,
      });
    case 'blocked':
      return t('agent.line.blocked', { stage: event.at, reason: event.reason });
    default: {
      // Exhaustiveness guard: adding a stage without deciding how it reads on
      // screen is a compile error here, not a silently untranslated line. The
      // cast keeps a sane runtime fallback if one ever slips through.
      const unhandled: never = event;
      return (unhandled as AgentEvent).line;
    }
  }
}
