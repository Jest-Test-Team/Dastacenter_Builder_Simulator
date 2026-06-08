/**
 * 5-function security framework dashboard.
 *
 * Renders a small overlay inside the builder (in `inspect` mode) that
 * shows the count of policy toggles ON in each of the five NIST-style
 * security functions + 3 deterrence categories.
 */

'use client';

import { useBuildStore } from '@/lib/store/build-store';
import { POLICY_GROUPS } from '@/lib/scoring/policy';
import { cn } from '@/lib/utils';
import { Shield, ShieldAlert, ShieldCheck, ShieldOff, X } from 'lucide-react';

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

export function SecurityFrameworkPanel({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const mode = useBuildStore((s) => s.mode);
  const policies = useBuildStore((s) => s.policies);

  if (mode !== 'inspect') return null;

  return (
    <>
      <div className="pointer-events-none absolute bottom-3 left-2 right-2 hidden md:block md:bottom-20 md:left-auto md:right-4 md:w-72">
        <div className="panel flex max-h-[32dvh] flex-col p-2 text-[10px] md:p-3 md:text-xs">
          <PanelHeader title="Security framework" />
          <PanelBody policies={policies} />
          <div className="mt-2 text-[9px] text-fg-muted">
            Coverage score feeds the 5-axis security score in your report.
          </div>
        </div>
      </div>

      <div
        className={cn('fixed inset-0 z-30 bg-black/40 md:hidden', mobileOpen ? 'block' : 'hidden')}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed inset-x-2 bottom-2 z-40 hidden max-h-[72dvh] flex-col overflow-hidden rounded-2xl border bg-bg-panel/98 shadow-2xl md:hidden',
          mobileOpen && 'flex',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Security framework"
      >
        <div className="flex items-center justify-between border-b p-3">
          <PanelHeader title="Security framework" />
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <PanelBody policies={policies} />
        </div>
        <div className="border-t px-3 py-2 text-[9px] text-fg-muted">
          Coverage score feeds the 5-axis security score in your report.
        </div>
      </div>
    </>
  );
}

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 font-semibold">
      <Shield className="h-4 w-4" />
      {title}
    </div>
  );
}

function PanelBody({ policies }: { policies: Record<string, boolean | number | string> }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
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
    </div>
  );
}
