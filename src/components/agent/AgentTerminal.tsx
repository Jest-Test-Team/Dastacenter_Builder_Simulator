/**
 * The agent's terminal.
 *
 * Renders the SSE stream from `/api/agent/settle` as it arrives. Nothing here
 * paces, delays or embellishes: a line appears when the server emits it, and the
 * `+123ms` stamp beside it is the elapsed time the agent measured. That is the
 * entire design constraint — a terminal in a privacy demo has to be a log, or it
 * is worse than no terminal at all.
 *
 * Green is for work that succeeded, amber for a halt. There is no red-herring
 * "processing…" line that isn't tied to real work.
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import { Terminal, Loader2, Play } from 'lucide-react';
import type { AgentEvent } from '@/lib/agent/types';
import { useT } from '@/lib/i18n/client';
import { agentLine, checkName } from './lines';

function toneOf(event: AgentEvent): string {
  if (event.stage === 'blocked') return 'text-warn';
  if (event.stage === 'settled') return 'text-success font-semibold';
  if (event.stage === 'verify') return 'text-success';
  return 'text-emerald-400/90';
}

export function AgentTerminal({
  address,
  chainId,
  onEvent,
}: {
  address: string | undefined;
  chainId: number;
  onEvent?: (event: AgentEvent) => void;
}) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const t = useT();

  const run = useCallback(async () => {
    if (!address || running) return;
    setRunning(true);
    setError(null);
    setEvents([]);

    try {
      const res = await fetch('/api/agent/settle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, chainId }),
      });
      if (!res.ok || !res.body) {
        setError(t('agent.error.unreachable'));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // SSE frames are separated by a blank line and can split across chunks,
      // so the tail of the buffer is kept until its terminator arrives.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const payload = frame.replace(/^data: /, '').trim();
          if (!payload) continue;
          try {
            const event = JSON.parse(payload) as AgentEvent;
            setEvents((current) => [...current, event]);
            onEvent?.(event);
          } catch {
            // A malformed frame is dropped rather than killing the run.
          }
          requestAnimationFrame(() => {
            logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
          });
        }
      }
    } catch {
      setError(t('agent.error.interrupted'));
    } finally {
      setRunning(false);
    }
  }, [address, chainId, running, onEvent, t]);

  return (
    <section className="overflow-hidden rounded-xl border border-emerald-500/30 bg-black shadow-[0_0_40px_-16px_rgb(16_185_129/0.6)]">
      <header className="flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
        <Terminal className="h-4 w-4 text-emerald-400" />
        <h3 className="font-mono text-xs uppercase tracking-wider text-emerald-300">
          {t('agent.title')}
        </h3>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-emerald-400/70">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              running ? 'animate-pulse bg-emerald-400' : 'bg-emerald-400/40'
            }`}
          />
          {running ? t('agent.status.running') : t('agent.status.idle')}
        </span>
      </header>

      <div
        ref={logRef}
        className="h-72 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed"
        role="log"
        aria-live="polite"
        aria-label="Settlement agent log"
      >
        {events.length === 0 && !running && (
          <p className="text-emerald-400/40">
            {address ? t('agent.idle.awaiting') : t('agent.idle.connect')}
          </p>
        )}

        {events.map((event, i) => (
          <div key={i} className="flex gap-2">
            <span className="shrink-0 text-emerald-400/40">
              +{String(event.elapsedMs).padStart(5, ' ')}ms
            </span>
            <span className={toneOf(event)}>
              [agent] {agentLine(event, t)}
            </span>
          </div>
        ))}

        {/* Per-check detail, so "verified" is auditable rather than a word. */}
        {events
          .filter((event): event is Extract<AgentEvent, { stage: 'verify' }> => event.stage === 'verify')
          .flatMap((event) => event.checks)
          .map((check, i) => (
            <div key={`check-${i}`} className="flex gap-2 pl-[4.5rem]">
              <span className={check.ok ? 'text-success' : 'text-warn'}>
                {check.ok ? '✓' : '✗'}
              </span>
              <span className="text-emerald-400/60">
                {checkName(check, t)} — {check.detail}
              </span>
            </div>
          ))}

        {running && <p className="mt-1 animate-pulse text-emerald-400/60">▊</p>}
        {error && <p className="mt-2 text-warn">[agent] {error}</p>}
      </div>

      <div className="border-t border-emerald-500/20 p-3">
        <button
          onClick={() => void run()}
          disabled={!address || running}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 font-mono text-xs text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {running ? t('agent.run.busy') : t('agent.run')}
        </button>
      </div>
    </section>
  );
}
