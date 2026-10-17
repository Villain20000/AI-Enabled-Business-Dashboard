/**
 * GET /api/data/template?kind=sales|inventory|kpis
 * Authenticated CSV template download.
 *
 * @module app/api/data/template/route
 */
import { NextResponse } from 'next/server';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { IMPORT_KINDS, csvTemplate, type ImportKind } from '@/lib/data/csv';

export async function GET(req: Request) {
  const guard = await requireOrgApi('dashboard:view');
  if ('error' in guard) return guard.error;

  const kind = new URL(req.url).searchParams.get('kind') ?? 'sales';
  if (!IMPORT_KINDS.includes(kind as ImportKind)) {
    return NextResponse.json({ error: 'Unknown template kind' }, { status: 400 });
  }

  return new NextResponse(csvTemplate(kind as ImportKind), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="datacore-${kind}-template.csv"`,
    },
  });
}
