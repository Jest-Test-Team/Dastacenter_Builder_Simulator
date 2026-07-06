import { NextResponse } from 'next/server';
import { getDemoBuild } from '@/lib/demos';

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  const demo = getDemoBuild(file.replace(/\.json$/i, ''));
  if (!demo) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  return new NextResponse(JSON.stringify(demo.snapshot, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${demo.id}.json"`,
      'cache-control': 'public, max-age=3600',
    },
  });
}
