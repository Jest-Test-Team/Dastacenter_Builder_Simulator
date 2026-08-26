/**
 * The design copilot.
 *
 * Two skills, one boundary. Everything the assistant is allowed to see is
 * projected here, in the browser, by `gate()`; the drawer shows the reader that
 * projection before it is sent and lets them narrow it further. The raw build
 * never leaves and there is no setting that would let it.
 *
 * The engine, not the model, has the last word: a proposal is applied to a clone
 * and re-scored by the same deterministic rules engine that scores everything
 * else, and the reader decides whether to keep it.
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, X, Loader2, Wand2, ListChecks, AlertTriangle } from 'lucide-react';
import { useBuildStore } from '@/lib/store/build-store';
import { score } from '@/lib/scoring';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { defaultChoice, gate, type DisclosureChoice } from '@/lib/ai/disclosure';
import { applyProposal, type ProposalPreview } from '@/lib/ai/proposal';
import type { DesignProposal } from '@/lib/ai/designer';
import type { BuildSnapshot } from '@/lib/store/build-store';
import type { AiAnswer } from '@/lib/ai/types';
import { DisclosureLedger } from './DisclosureLedger';

type Tab = 'explain' | 'propose';

export function CopilotPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const asideRef = useRef<HTMLElement>(null);
  useFocusTrap(open, asideRef);

  const [tab, setTab] = useState<Tab>('explain');
  const [choice, setChoice] = useState<DisclosureChoice>(defaultChoice);
  const [request, setRequest] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<AiAnswer | null>(null);
  const [preview, setPreview] = useState<ProposalPreview<BuildSnapshot> | null>(null);
  const [proposal, setProposal] = useState<DesignProposal | null>(null);

  const state = useBuildStore((s) => s.exportSnapshot);
  const loadBuild = useBuildStore((s) => s.loadBuild);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Recomputed on every toggle so the payload shown is the payload sent.
  const gated = useMemo(() => {
    if (!open) return null;
    const snapshot = state();
    return gate(snapshot, score(snapshot), choice);
  }, [open, choice, state]);

  async function call(skill: 'rule-explainer' | 'design-proposal') {
    if (!gated || pending) return;
    setPending(true);
    setError(null);
    setExplanation(null);
    setProposal(null);
    setPreview(null);
    try {
      const res = await fetch(`/api/ai/${skill}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gated, question: request.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'The assistant is unavailable.');
      } else if (skill === 'rule-explainer') {
        setExplanation(data as AiAnswer);
      } else {
        const result = data as DesignProposal;
        setProposal(result);
        // Placement and re-scoring happen here, never on the server and never
        // in the model: the model named blocks, the grid decides if they fit.
        setPreview(applyProposal(state(), result.items));
      }
    } catch {
      setError('The assistant could not be reached.');
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        ref={asideRef}
        className="panel flex h-[100dvh] w-full flex-col rounded-none border-r-0 md:w-[28rem] md:rounded-l-lg md:rounded-r-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="copilot-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h2 id="copilot-title" className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            Design copilot
          </h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close copilot">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b p-2">
          <button
            className={tab === 'explain' ? 'btn flex-1 text-sm' : 'btn-ghost flex-1 text-sm'}
            onClick={() => setTab('explain')}
          >
            <ListChecks className="h-4 w-4" /> Explain findings
          </button>
          <button
            className={tab === 'propose' ? 'btn flex-1 text-sm' : 'btn-ghost flex-1 text-sm'}
            onClick={() => setTab('propose')}
          >
            <Wand2 className="h-4 w-4" /> Suggest blocks
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
          {gated && <DisclosureLedger choice={choice} onChange={setChoice} preview={gated} />}

          <div>
            <label className="text-xs text-fg-muted" htmlFor="copilot-request">
              {tab === 'explain'
                ? 'Anything specific to focus on? (optional)'
                : 'What do you want to improve?'}
            </label>
            <textarea
              id="copilot-request"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              maxLength={600}
              rows={3}
              placeholder={
                tab === 'explain'
                  ? 'Why is my power axis so low?'
                  : 'Get me to Tier III without adding cooling load'
              }
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
            />
            <button
              className="btn mt-2 w-full text-sm"
              disabled={pending || (tab === 'propose' && request.trim().length < 3)}
              onClick={() => void call(tab === 'explain' ? 'rule-explainer' : 'design-proposal')}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {tab === 'explain' ? 'Explain' : 'Propose'}
            </button>
          </div>

          {error && (
            <p className="rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-fg-muted">
              {error}
            </p>
          )}

          {explanation && (
            <div>
              <p className="whitespace-pre-line text-sm text-fg-muted">{explanation.answer}</p>
              <p className="mt-2 text-[11px] text-fg-muted">
                Findings from the rules engine ({explanation.sources.length}), phrased by{' '}
                <span className="font-mono">{explanation.model}</span>. The engine made the finding;
                the model only worded it.
              </p>
            </div>
          )}

          {proposal && preview && (
            <div className="space-y-3">
              <p className="text-sm">{proposal.summary}</p>

              <div className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">
                  Score {preview.before.score} → {preview.after.score}{' '}
                  <span className="text-xs text-fg-muted">
                    (tier {preview.before.tier} → {preview.after.tier})
                  </span>
                </p>
                <p className="mt-1 text-xs text-fg-muted">
                  Re-scored by the deterministic engine on a copy of your build. Nothing has changed
                  yet.
                </p>
              </div>

              {preview.applied.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {preview.applied.map((item) => (
                    <li key={item.blockId} className="rounded-md border border-success/30 px-3 py-2">
                      <span className="font-medium">
                        +{item.placed} {item.displayName}
                      </span>
                      <span className="block text-xs text-fg-muted">{item.why}</span>
                    </li>
                  ))}
                </ul>
              )}

              {(preview.rejected.length > 0 || proposal.unknownBlockIds.length > 0) && (
                <div className="rounded-md border border-warn/30 bg-warn/5 px-3 py-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 text-warn" /> Rejected
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs text-fg-muted">
                    {preview.rejected.map((item) => (
                      <li key={item.blockId}>
                        {item.displayName} — {item.reason ?? 'could not be placed'}
                      </li>
                    ))}
                    {proposal.unknownBlockIds.map((id) => (
                      <li key={id}>
                        <span className="font-mono">{id}</span> — no such block in the catalog
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.applied.length > 0 && (
                <button
                  className="btn w-full text-sm"
                  onClick={() => {
                    loadBuild(preview.state);
                    onClose();
                  }}
                >
                  Apply to my build
                </button>
              )}
            </div>
          )}
        </div>

        <div className="border-t p-3 text-[10px] text-fg-muted">
          Suggestions are advisory. The scoring engine is a deterministic rules engine and is never
          AI — it has the final word on every design.
        </div>
      </aside>
    </div>
  );
}
