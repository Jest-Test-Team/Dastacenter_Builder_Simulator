/**
 * 5-function security framework dashboard.
 *
 * Renders a small overlay inside the builder (in `inspect` mode) that
 * shows the count of policy toggles ON in each of the five NIST-style
 * security functions + 3 deterrence categories.
 *
 * Visual: a 4×2 grid of cards with an icon, count, and a
 * traffic-light dot.
 */

'use client';

import { useBuildStore } from '@/lib/store/build-store';
import { POLICY_GROUPS } from '@/lib/scoring/policy';
import { Shield, ShieldAlert, ShieldCheck, ShieldOff } from 'lucide-react';

const ICONS: Record<string, typeof Shield> = {
  preventive: ShieldCheck,
  detective: ShieldAlert,
  corrective: Shield,
  recovery: Shield,
  compensating: ShieldOff,
  physical: Shield,
  logical: Shield,
  administrative: Shield,
};

const COLORS: Record<string, string> = {
  preventive: 'text-success',
  detective: 'text-warn',
  corrective: 'text-primary',
  recovery: 'text-fg',
  compensating: 'text-fg-muted',
  physical: 'text-danger',
  logical: 'text-warn',
  administrative: 'text-fg-muted',
};

export function SecurityFrameworkPanel() {
  const mode = useBuildStore((s) => s.mode);
  const policies = useBuildStore((s) => s.policies);

  if (mode !== 'inspect') return null;

  return (
    <div className="pointer-events-none absolute bottom-20 right-4 w-72">
      <div className="panel p-3 text-xs">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <Shield className="h-4 w-4" />
          Security framework
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {POLICY_GROUPS.map((g) => {
            const onCount = g.keys.filter((k) => policies[k] === true).length;
            const numCount = g.keys.filter((k) => typeof policies[k] === 'number').length;
            const total = g.keys.length;
            const pct = total > 0 ? Math.round((onCount / total) * 100) : 0;
            const Icon = ICONS[g.id] ?? Shield;
            const color = COLORS[g.id] ?? 'text-fg';
            return (
              <div key={g.id} className="rounded border border-border bg-bg-subtle p-2">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span className="font-medium">{g.label}</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-base">{onCount}</span>
                  <span className="text-fg-muted">/ {total}</span>
                  {numCount > 0 && (
                    <span className="text-[9px] text-fg-muted">+{numCount} num</span>
                  )}
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-bg">
                  <div
                    className={`h-full ${pct >= 75 ? 'bg-success' : pct >= 40 ? 'bg-warn' : 'bg-danger'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-[9px] text-fg-muted">
          Coverage score feeds the 5-axis security score in your report.
        </div>
      </div>
    </div>
  );
}
