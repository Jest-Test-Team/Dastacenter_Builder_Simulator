/**
 * GET /api/webmcp/manifest
 *
 * The tool catalog as JSON: names, model-facing descriptions, input schemas.
 *
 * The tools themselves only exist inside a WebMCP-capable browser sitting on
 * the builder page, which makes them awkward to review and impossible to assert
 * against from a test runner. This route is the same catalog, statically
 * derived from the same definitions, so a reviewer can read the surface with
 * curl and the Robot suite can check that nothing disclosure-gated leaked into
 * a description or a schema. Public; contains no build data.
 */

import { NextResponse } from 'next/server';
import { toolManifest } from '@/lib/webmcp/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(toolManifest(), {
    status: 200,
    headers: { 'cache-control': 'public, max-age=60' },
  });
}
