/**
 * The certificate title is what a viewer reads on "My Certificates" and on any
 * marketplace, and it is written into permanent on-chain metadata — so the
 * mapping is worth pinning rather than leaving to a string literal.
 */

import { describe, expect, it } from 'vitest';
import type { RatingReport } from '@/lib/scoring';
import { buildCertificateMetadata } from '@/lib/sbt/metadata';

function reportAt(level: RatingReport['level'], score: number): RatingReport {
  return {
    score,
    level,
    tier: 'IV',
    certifiable: true,
    breakdown: { redundancy: 90, cooling: 90, power: 90, safety: 90, efficiency: 90, security: 90 },
    issues: [],
    achievements: [],
    pue: 1.2,
    wue: 0,
    totalHeatKW: 0,
    totalITLoadKW: 0,
    competitionScore: 880,
    rulePackVersion: '0.1.0',
  } as unknown as RatingReport;
}

function titleFor(level: RatingReport['level']): string {
  return buildCertificateMetadata(
    reportAt(level, 97),
    'build-1',
    `0x${'11'.repeat(32)}`,
    `0x${'22'.repeat(20)}`,
    'Tester',
    'data:image/svg+xml;base64,AA==',
    'https://example.test',
  ).name;
}

describe('certificate title', () => {
  it('names the top level the way the credential is marketed', () => {
    expect(titleFor('Platinum')).toBe('Elite Green Architect SBT');
  });

  it('leaves every other level on the default naming', () => {
    expect(titleFor('Gold')).toBe('Datacenter Builder Certificate - Gold');
    expect(titleFor('Bronze')).toBe('Datacenter Builder Certificate - Bronze');
  });

  it('keeps the machine-readable Level attribute unchanged', () => {
    const metadata = buildCertificateMetadata(
      reportAt('Platinum', 97),
      'build-1',
      `0x${'11'.repeat(32)}`,
      `0x${'22'.repeat(20)}`,
      'Tester',
      'data:image/svg+xml;base64,AA==',
      'https://example.test',
    );
    expect(metadata.attributes).toContainEqual({ trait_type: 'Level', value: 'Platinum' });
  });
});
