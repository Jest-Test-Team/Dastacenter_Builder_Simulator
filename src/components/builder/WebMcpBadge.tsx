/**
 * "N WebMCP tools exposed".
 *
 * This is the component that registers the tool catalog — mounting it is what
 * turns the builder into something an agent can drive — but it renders nothing
 * at all unless the browser actually has a WebMCP surface. In every other
 * browser the effect no-ops and this returns null, so the chip appearing is
 * itself the signal that an agent is present.
 */

'use client';

import { Bot } from 'lucide-react';
import { useWebMcp } from '@/lib/webmcp/use-webmcp';

export function WebMcpBadge() {
  const { available, toolCount } = useWebMcp();

  if (!available) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="webmcp-badge"
      className="panel pointer-events-auto flex items-center gap-1.5 p-2 text-xs font-medium"
      title="This page exposes its builder actions to the browser's AI agent over WebMCP."
    >
      <Bot className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
      {toolCount} WebMCP tools exposed
    </div>
  );
}
