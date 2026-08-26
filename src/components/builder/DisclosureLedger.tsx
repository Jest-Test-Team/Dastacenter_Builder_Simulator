/**
 * The disclosure ledger.
 *
 * Compact's `disclose` keyword turns every leak into one reviewable word at the
 * line where it happens. This is that idea as UI: before anything reaches a
 * model, the reader sees each field, what it reveals, and a switch — and the
 * fields with no switch are listed too, so the absence is visible rather than
 * merely true.
 *
 * The projection is computed here, in the browser. Only the result is sent.
 */

'use client';

import { Eye, EyeOff, Lock } from 'lucide-react';
import {
  DISCLOSURE_FIELDS,
  FIELD_INFO,
  NEVER_DISCLOSED,
  type DisclosureChoice,
  type GateResult,
} from '@/lib/ai/disclosure';
import { cn } from '@/lib/utils';

export function DisclosureLedger({
  choice,
  onChange,
  preview,
}: {
  choice: DisclosureChoice;
  onChange: (next: DisclosureChoice) => void;
  preview: GateResult;
}) {
  return (
    <section className="rounded-lg border border-border bg-bg-panel/60 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Eye className="h-4 w-4 text-primary" />
        What the assistant will see
      </h3>
      <p className="mt-1 text-xs text-fg-muted">
        Everything below is computed on this machine. Only the fields you leave on are sent.
      </p>

      <ul className="mt-3 space-y-2">
        {DISCLOSURE_FIELDS.map((field) => {
          const on = Boolean(choice[field]);
          return (
            <li key={field}>
              <button
                type="button"
                onClick={() => onChange({ ...choice, [field]: !on })}
                aria-pressed={on}
                className={cn(
                  'flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors',
                  on ? 'border-primary/40 bg-primary/5' : 'border-border opacity-70',
                )}
              >
                {on ? (
                  <Eye className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
                )}
                <span>
                  <span className="text-sm font-medium">{FIELD_INFO[field].label}</span>
                  <span className="block text-xs text-fg-muted">{FIELD_INFO[field].describes}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <h4 className="mt-4 flex items-center gap-2 text-xs font-semibold text-fg-muted">
        <Lock className="h-3.5 w-3.5" />
        Never sent, under any setting
      </h4>
      <ul className="mt-1 list-disc space-y-0.5 pl-6 text-xs text-fg-muted">
        {NEVER_DISCLOSED.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-fg-muted">
          Show the exact payload ({preview.disclosed.length} field
          {preview.disclosed.length === 1 ? '' : 's'})
        </summary>
        <pre className="mt-2 max-h-56 overflow-auto rounded-md border border-border bg-bg p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(preview.context, null, 2)}
        </pre>
      </details>
    </section>
  );
}
