/**
 * Registering the tool catalog with the browser's WebMCP agent.
 *
 * Three things make this more delicate than a normal effect:
 *
 * 1. **The API moved.** It shipped on `navigator.modelContext` and moved to
 *    `document.modelContext` in Chromium 150. Both are live in the wild right
 *    now — a ChatGPT in-app browser and a Chrome 149 with the flag on will not
 *    agree — so we look for both and take whichever answers.
 * 2. **The API is usually absent.** Every other browser has no `modelContext`
 *    at all. That is the normal case, not an error case: detection failing must
 *    be completely silent, with no console noise and no UI, or the 99% of users
 *    who will never have an agent get a broken-looking app.
 * 3. **This app server-renders on Cloudflare Workers via OpenNext.** There is no
 *    `document` there. Every access is inside `useEffect`, which never runs on
 *    the server, and the initial state is the "not available" one so hydration
 *    matches the server's HTML exactly.
 *
 * Unregistration goes through an `AbortController`: `registerTool` accepts a
 * signal, and aborting on unmount retracts every tool in one call. That matters
 * for a page with a 3D canvas — a fast-refresh remount that left its tools
 * behind would leave the agent holding stale handles to a dead store.
 */

'use client';

import { useEffect, useState } from 'react';
import { WEBMCP_TOOLS, type WebMcpTool } from './tools';

/**
 * A minimal ambient description of the API.
 *
 * There are no published typings, and `any` here would erase the one thing
 * worth checking — that we call the API the way the spec says. Both shapes are
 * optional because a given browser implements one, the other, or neither.
 */
interface ModelContext {
  registerTool?: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => void;
  provideContext?: (context: { tools: WebMcpTool[] }) => void;
}

declare global {
  interface Navigator {
    modelContext?: ModelContext;
  }
  interface Document {
    modelContext?: ModelContext;
  }
}

/**
 * Find the agent surface, preferring the current location.
 *
 * `document` first because that is where the API lives from Chromium 150 on;
 * a browser exposing both should be treated as the newer one.
 */
export function getModelContext(): ModelContext | null {
  if (typeof document === 'undefined') return null;
  return document.modelContext ?? navigator?.modelContext ?? null;
}

export interface WebMcpStatus {
  /** Whether this browser exposes a WebMCP agent surface at all. */
  available: boolean;
  /** How many tools were actually registered. Zero until the effect runs. */
  toolCount: number;
}

/**
 * Register every tool for the lifetime of the calling component.
 *
 * Returns status rather than rendering anything, so the visible affordance is
 * somebody else's decision.
 */
export function useWebMcp(tools: readonly WebMcpTool[] = WEBMCP_TOOLS): WebMcpStatus {
  const [status, setStatus] = useState<WebMcpStatus>({ available: false, toolCount: 0 });

  useEffect(() => {
    const modelContext = getModelContext();
    if (!modelContext) return;

    const controller = new AbortController();

    if (typeof modelContext.registerTool === 'function') {
      for (const tool of tools) {
        modelContext.registerTool(tool, { signal: controller.signal });
      }
    } else if (typeof modelContext.provideContext === 'function') {
      // Older shape: one call replaces the whole set, so unregistering means
      // handing back an empty list rather than aborting.
      modelContext.provideContext({ tools: [...tools] });
    } else {
      return;
    }

    setStatus({ available: true, toolCount: tools.length });

    return () => {
      controller.abort();
      if (typeof modelContext.registerTool !== 'function') {
        modelContext.provideContext?.({ tools: [] });
      }
    };
  }, [tools]);

  return status;
}
