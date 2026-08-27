/**
 * The published KSN dividend rate card.
 *
 * Per certificate, per epoch, by certification level. Published here — rather
 * than decided per run — so a holder can compute their own entitlement and check
 * the agent's arithmetic. An agent whose payout cannot be predicted by the payee
 * is indistinguishable from one that pays whatever it likes.
 *
 * This is also the grounding for the model's decision in `settle.ts`: the model
 * explains the disbursement, but the figure is re-derived here deterministically,
 * so a hallucinated number cannot become a transfer.
 */

/** The attribute names the certificate metadata may use for the level. */
const LEVEL_TRAITS = ['Level', 'Certification Level'];

export const RATE_BY_LEVEL: Record<string, number> = {
  Diamond: 2000,
  Platinum: 1500,
  Gold: 1200,
  Silver: 800,
  Bronze: 500,
};

/** An unrecognised level pays the floor rather than nothing — and never more. */
export const DEFAULT_RATE = 500;

export interface CertificateAttribute {
  trait_type: string;
  value: string | number;
}

/** Read the certification level out of a metadata attribute list. */
export function levelOf(attributes: readonly CertificateAttribute[] | undefined): string {
  const match = attributes?.find((attribute) => LEVEL_TRAITS.includes(attribute.trait_type));
  return match ? String(match.value) : 'Bronze';
}

/** Whole KSN owed for one certificate at the given level. */
export function rateFor(level: string): number {
  return RATE_BY_LEVEL[level] ?? DEFAULT_RATE;
}

/** Whole KSN owed across a set of levels. */
export function entitlementOf(levels: readonly string[]): number {
  return levels.reduce((total, level) => total + rateFor(level), 0);
}
