/**
 * Browser-library JS extension that plants a WebMCP agent surface before the
 * page loads.
 *
 * No shipping browser on this machine exposes `modelContext`, so the suite
 * provides one. It has to exist *before* the app's first script runs: the hook
 * (`src/lib/webmcp/use-webmcp.ts`) probes `document.modelContext ??
 * navigator.modelContext` once, inside a `useEffect`, and stays silent forever
 * if nothing answers. Browser 19.14.2 has no init-script keyword, but its JS
 * extension mechanism injects the live Playwright `context` into any exported
 * function whose parameter is named `context` — which is exactly enough to call
 * `context.addInitScript` ourselves.
 *
 * The stub honours the `signal` option because the hook relies on it: Next.js
 * dev mode runs effects under React strict mode, which mounts, cleans up
 * (aborting every registration) and mounts again. A stub that ignored the
 * abort would count 12 tools and the suite would be asserting an artefact of
 * strict mode rather than the catalog.
 */

async function installWebMcpStub(context) {
  await context.addInitScript(`(() => {
    const stub = {
      __webmcpTestStub: true,
      _tools: [],
      registerTool(tool, options) {
        this._tools.push(tool);
        if (options && options.signal) {
          options.signal.addEventListener('abort', () => {
            const index = this._tools.indexOf(tool);
            if (index !== -1) this._tools.splice(index, 1);
          });
        }
        return Promise.resolve();
      },
    };
    // Defined on both surfaces the hook probes; document wins, but a page-world
    // script that only knows the pre-Chromium-150 location still finds it.
    Object.defineProperty(document, 'modelContext', { value: stub, configurable: true });
    Object.defineProperty(navigator, 'modelContext', { value: stub, configurable: true });
    window.__webmcpStub = stub;
  })();`);
  return 'WebMCP stub armed for every document in this context';
}

exports.__esModule = true;
exports.installWebMcpStub = installWebMcpStub;
