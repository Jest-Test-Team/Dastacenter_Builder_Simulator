/**
 * The Midnight beat, made visible.
 *
 * A terminal overlay shown while a threshold proof is being acquired and the
 * mint is relayed. Every line is emitted by the real flow — the graph digest is
 * the actual digest, the threshold and rule pack are the ones in the statement,
 * the token id and transaction hash come back from the chain. Nothing here is
 * a scripted animation, because a fake console in a privacy demo is exactly the
 * thing a reviewer should distrust.
 *
 * What it is *for* is showing the local/remote boundary: the lines marked
 * `local` never left the browser, which is the entire claim being made.
 */

'use client';

import { useEffect, useRef } from 'react';
import { Loader2, ShieldCheck, XCircle } from 'lucide-react';

export type ConsoleTone = 'info' | 'local' | 'ok' | 'fail';

export interface ConsoleLine {
  tone: ConsoleTone;
  text: string;
}

const TONE_CLASS: Record<ConsoleTone, string> = {
  info: 'text-sky-300/80',
  local: 'text-amber-300/90',
  ok: 'text-emerald-300',
  fail: 'text-red-400',
};

export function ZkProvingConsole({
  open,
  lines,
  status,
  onClose,
}: {
  open: boolean;
  lines: ConsoleLine[];
  status: 'running' | 'done' | 'failed';
  onClose: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Optional call: not every environment implements scrollIntoView, and
    // failing to autoscroll must never take the console down mid-proof.
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [lines]);

  // Only dismissable once it has settled: closing mid-proof would suggest the
  // work stopped, which it would not have.
  useEffect(() => {
    if (!open || status === 'running') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, status, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-lg"
      role="dialog"
      aria-modal="true"
      aria-label="Zero-knowledge proof progress"
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-lg border border-sky-500/30 bg-[#05080f] shadow-2xl ring-1 ring-sky-400/10">
        <div className="flex items-center gap-2 border-b border-sky-500/20 px-4 py-2.5">
          {status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-sky-400" />}
          {status === 'done' && <ShieldCheck className="h-4 w-4 text-emerald-400" />}
          {status === 'failed' && <XCircle className="h-4 w-4 text-red-400" />}
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-sky-200/80">
            midnight · compact circuit
          </span>
        </div>

        <div className="max-h-[75vh] min-h-[16rem] overflow-y-auto px-4 py-3 font-mono text-[13px] leading-relaxed md:text-[14px]">
          {lines.map((line, index) => (
            <div key={index} className={TONE_CLASS[line.tone]}>
              <span className="select-none text-white/25">{'> '}</span>
              {line.text}
            </div>
          ))}
          {status === 'running' && (
            <div className="text-sky-300/60">
              <span className="select-none text-white/25">{'> '}</span>
              <span className="animate-pulse">▊</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="flex items-center justify-between border-t border-sky-500/20 px-4 py-2">
          <p className="font-mono text-[10px] text-amber-300/70">
            amber lines never left this browser
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={status === 'running'}
            className="rounded border border-white/15 px-3 py-1 text-xs text-white/70 transition hover:text-white disabled:opacity-30"
          >
            {status === 'running' ? 'Working…' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
