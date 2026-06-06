/**
 * Policy panel.
 *
 * Right-side drawer for non-3D controls: deterrence, 5-function
 * security, privacy, ESG. Toggles the PolicyState in the build store.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useBuildStore } from '@/lib/store/build-store';
import { POLICY_GROUPS, POLICY_LABELS, type PolicyKey } from '@/lib/scoring/policy';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { cn } from '@/lib/utils';
import { Shield, X, ChevronRight } from 'lucide-react';

export function PolicyPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const asideRef = useRef<HTMLElement>(null);
  useFocusTrap(open, asideRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        ref={asideRef}
        className="panel flex h-full w-96 flex-col rounded-l-lg rounded-r-none border-r-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h2 id="policy-panel-title" className="flex items-center gap-2 font-semibold">
            <Shield className="h-5 w-5" />
            Policy & Security
          </h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {POLICY_GROUPS.map((g) => (
            <PolicyGroup key={g.id} group={g} />
          ))}
        </div>
        <div className="border-t p-3 text-[10px] text-fg-muted">
          All toggles feed the scoring engine alongside your 3D blocks.
        </div>
      </aside>
    </div>
  );
}

function PolicyGroup({ group }: { group: (typeof POLICY_GROUPS)[number] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="mb-3">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between rounded-md bg-bg-subtle px-3 py-2 text-left text-sm font-medium hover:bg-bg-panel"
      >
        <span>{group.label}</span>
        <ChevronRight
          className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')}
        />
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 px-1">
          <p className="text-xs text-fg-muted">{group.description}</p>
          {group.keys.map((k) => (
            <PolicyToggle key={k} policyKey={k} />
          ))}
        </div>
      )}
    </section>
  );
}

function PolicyToggle({ policyKey }: { policyKey: PolicyKey }) {
  const value = useBuildStore((s) => s.policies[policyKey]);
  const setPolicy = useBuildStore((s) => s.setPolicy);
  const label = POLICY_LABELS[policyKey];

  if (typeof value === 'boolean') {
    return (
      <label className="flex cursor-pointer items-start justify-between gap-2 rounded border border-border p-2 hover:bg-bg-subtle">
        <div>
          <div className="text-sm font-medium">{label.label}</div>
          {label.help && <div className="text-[10px] text-fg-muted">{label.help}</div>}
        </div>
        <input
          type="checkbox"
          className="h-4 w-4 cursor-pointer"
          checked={value}
          onChange={(e) => setPolicy(policyKey, e.target.checked)}
        />
      </label>
    );
  }

  if (typeof value === 'number') {
    return (
      <label className="block rounded border border-border p-2 hover:bg-bg-subtle">
        <div className="mb-1 text-sm font-medium">
          {label.label} <span className="font-mono text-fg-muted">({value})</span>
        </div>
        <input
          type="range"
          className="w-full"
          min={policyKey.includes('cadence') ? 0 : 0}
          max={
            policyKey.includes('pue_target') || policyKey.includes('wue_target')
              ? 3
              : policyKey.includes('hours')
                ? 168
                : 100
          }
          step={policyKey.includes('pue') || policyKey.includes('wue') ? 0.1 : 1}
          value={value}
          onChange={(e) => setPolicy(policyKey, parseFloat(e.target.value))}
        />
      </label>
    );
  }

  if (typeof value === 'string') {
    return (
      <label className="block rounded border border-border p-2 hover:bg-bg-subtle">
        <div className="mb-1 text-sm font-medium">{label.label}</div>
        <select
          className="input"
          value={value}
          onChange={(e) => setPolicy(policyKey, e.target.value)}
        >
          {policyKey === 'recovery.dr_site' && (
            <>
              <option value="none">None</option>
              <option value="cold">Cold site</option>
              <option value="warm">Warm site</option>
              <option value="hot">Hot site</option>
            </>
          )}
          {policyKey === 'privacy.data_residency' && (
            <>
              <option value="none">No specific region</option>
              <option value="eu">European Union (GDPR)</option>
              <option value="us">United States (CCPA)</option>
              <option value="sg">Singapore (PDPA)</option>
              <option value="cn">China (PIPL)</option>
            </>
          )}
        </select>
      </label>
    );
  }

  return null;
}
