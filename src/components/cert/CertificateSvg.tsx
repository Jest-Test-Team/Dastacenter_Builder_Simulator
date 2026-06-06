/**
 * Certificate SVG template.
 *
 * Designed to look credible when printed, exported, or shared.
 * Layout: 16:9-ish, scaled to fit container.
 */

import type { RatingReport } from '@/lib/scoring';
import { QRCodeSVG } from 'qrcode.react';

export interface CertificateSvgProps {
  report: RatingReport;
  recipientName: string;
  recipientWallet?: string;
  buildId: string;
}

export function CertificateSvg({ report, recipientName, recipientWallet, buildId }: CertificateSvgProps) {
  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/cert/${buildId}`;
  const date = new Date().toISOString().slice(0, 10);
  const certId = `DCB-${buildId.slice(0, 6).toUpperCase()}-${report.level.toUpperCase()}`;

  return (
    <svg
      data-cert-svg
      viewBox="0 0 1000 700"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full rounded-lg border border-border bg-bg-panel shadow-2xl"
    >
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
        <linearGradient id="seal" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      <rect width="1000" height="700" fill="url(#bg)" />

      {/* Border frame */}
      <rect x="20" y="20" width="960" height="660" fill="none" stroke="#fbbf24" strokeWidth="2" />
      <rect x="35" y="35" width="930" height="630" fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.4" />

      {/* Watermark */}
      <text x="500" y="380" textAnchor="middle" fontFamily="sans-serif" fontSize="180" fontWeight="bold" fill="#fbbf24" opacity="0.05">
        DC
      </text>

      {/* Header */}
      <text x="500" y="100" textAnchor="middle" fontFamily="sans-serif" fontSize="14" letterSpacing="6" fill="#94a3b8">
        DATACENTER BUILDER SIMULATOR
      </text>
      <text x="500" y="170" textAnchor="middle" fontFamily="serif" fontSize="56" fontWeight="bold" fill="#fbbf24">
        Certificate of Achievement
      </text>
      <text x="500" y="220" textAnchor="middle" fontFamily="sans-serif" fontSize="16" fill="#cbd5e1">
        This certifies that
      </text>

      {/* Recipient */}
      <text x="500" y="280" textAnchor="middle" fontFamily="serif" fontSize="48" fontWeight="bold" fill="#f8fafc">
        {recipientName}
      </text>
      {recipientWallet && (
        <text x="500" y="310" textAnchor="middle" fontFamily="monospace" fontSize="14" fill="#94a3b8">
          {recipientWallet}
        </text>
      )}

      <text x="500" y="360" textAnchor="middle" fontFamily="sans-serif" fontSize="14" fill="#cbd5e1">
        has demonstrated proficiency in data center design by building a virtual
      </text>
      <text x="500" y="380" textAnchor="middle" fontFamily="sans-serif" fontSize="14" fill="#cbd5e1">
        facility evaluated against international standards
      </text>

      {/* Score row */}
      <g transform="translate(180, 430)">
        <text textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#94a3b8" letterSpacing="2">SCORE</text>
        <text x="0" y="35" textAnchor="middle" fontFamily="serif" fontSize="42" fontWeight="bold" fill="#f8fafc">
          {report.score}
        </text>
      </g>
      <g transform="translate(350, 430)">
        <text textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#94a3b8" letterSpacing="2">TIER</text>
        <text x="0" y="35" textAnchor="middle" fontFamily="serif" fontSize="42" fontWeight="bold" fill="#fbbf24">
          {report.tier}
        </text>
      </g>
      <g transform="translate(520, 430)">
        <text textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#94a3b8" letterSpacing="2">LEVEL</text>
        <text x="0" y="35" textAnchor="middle" fontFamily="serif" fontSize="42" fontWeight="bold" fill="#22d3ee">
          {report.level}
        </text>
      </g>
      <g transform="translate(720, 430)">
        <text textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#94a3b8" letterSpacing="2">PUE</text>
        <text x="0" y="35" textAnchor="middle" fontFamily="serif" fontSize="42" fontWeight="bold" fill="#a78bfa">
          {report.pue || '–'}
        </text>
      </g>

      {/* Seal */}
      <g transform="translate(80, 600)">
        <circle r="40" fill="url(#seal)" />
        <text textAnchor="middle" y="-5" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#1e1b4b" letterSpacing="2">
          ISSUED
        </text>
        <text textAnchor="middle" y="12" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#1e1b4b">
          {date}
        </text>
      </g>

      {/* QR + cert id */}
      <g transform="translate(820, 600)">
        <foreignObject x="-60" y="-60" width="120" height="120">
          <div style={{ background: 'white', padding: 8, borderRadius: 4 }}>
            <QRCodeSVG value={verifyUrl} size={104} level="M" />
          </div>
        </foreignObject>
      </g>

      <text x="500" y="660" textAnchor="middle" fontFamily="monospace" fontSize="10" fill="#64748b">
        {certId} · verify at {verifyUrl}
      </text>
    </svg>
  );
}
