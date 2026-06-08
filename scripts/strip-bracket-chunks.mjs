#!/usr/bin/env node
/**
 * Cloudflare Workers Assets fails to serve deployed files whose path contains
 * square brackets (works in local `wrangler dev`, 404s in production). Next.js
 * names per-route client chunks after the route, e.g.
 *   _next/static/chunks/app/build/[scenarioId]/page-<hash>.js
 * The browser requests them URL-encoded (%5B…%5D), which never matches on the
 * deployed asset server -> 404 -> ChunkLoadError on every dynamic route.
 *
 * This runs after `opennextjs-cloudflare build` and strips the bracket chars
 * from static-chunk asset paths only:
 *   1. renames the bracketed directories under .open-next/assets
 *   2. rewrites every `chunks/app/…/<seg>/…js` reference in the bundle
 * Route definitions (routes-manifest, the [scenarioId] server route) are NOT
 * touched — we only rewrite substrings inside `chunks/app/…`.
 */
import { readdirSync, statSync, renameSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '.open-next';
const ASSET_CHUNKS = join(ROOT, 'assets/_next/static/chunks/app');
const TEXT_EXT = /\.(js|mjs|cjs|json|html|txt|map)$/;

// Remove [ ] and their %5B/%5D encodings from a string.
const strip = (s) => s.replace(/%5B|%5D|\[|\]/gi, '');

// Match a static-chunk URL/path and strip brackets only within it.
const CHUNK_REF = /(?:static\/)?chunks\/app\/[^"'`\s\\)]*?\.js/g;
const rewrite = (content) => content.replace(CHUNK_REF, (m) => strip(m));

let renamed = 0;
let patched = 0;

// 1. Rename bracketed directories (deepest first so parents stay valid).
function collectDirs(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectDirs(full, out);
      out.push(full);
    }
  }
}
try {
  const dirs = [];
  collectDirs(ASSET_CHUNKS, dirs);
  for (const full of dirs) {
    const idx = full.lastIndexOf('/');
    const base = full.slice(idx + 1);
    if (/[[\]]/.test(base)) {
      const next = full.slice(0, idx + 1) + strip(base);
      renameSync(full, next);
      renamed++;
    }
  }
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}

// 2. Rewrite references across the whole .open-next bundle.
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      walk(full);
    } else if (TEXT_EXT.test(entry)) {
      const content = readFileSync(full, 'utf8');
      if (content.includes('chunks/app/')) {
        const next = rewrite(content);
        if (next !== content) {
          writeFileSync(full, next);
          patched++;
        }
      }
    }
  }
}
walk(ROOT);

console.log(`strip-bracket-chunks: renamed ${renamed} dir(s), patched ${patched} file(s).`);
