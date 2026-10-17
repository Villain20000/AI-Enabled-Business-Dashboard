/**
 * GET /api/data/export?kind=sales|inventory|kpis
 * Export the active organization's rows as CSV.
 *
 * @module app/api/data/export/route
 */
import { NextResponse } from 'next/server';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { supabaseServer } from '@/lib/supabase/server';
import { IMPORT_KINDS, toCsv, type ImportKind } from '@/lib/data/csv';

const TABLE_BY_KIND: Record<ImportKind, { table: string; headers: string[] }> = {
  sales: { table: 'sales_data', headers: ['month', 'sales', 'target'] },
  inventory: { table: 'inventory_data', headers: ['product', 'stock', 'status'] },
  kpis: { table: 'kpis', headers: ['title', 'value', 'change', 'trend'] },
};

export async function GET(req: Request) {
  const guard = await requireOrgApi('dashboard:view');
  if ('error' in guard) return guard.error;

  const kind = new URL(req.url).searchParams.get('kind') ?? 'sales';
  if (!IMPORT_KINDS.includes(kind as ImportKind)) {
    return NextResponse.json({ error: 'Unknown export kind' }, { status: 400 });
  }

  const config = TABLE_BY_KIND[kind as ImportKind];
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from(config.table)
    .select(config.headers.join(', '))
    .eq('org_id', guard.ctx.orgId);

  if (error) {
    return NextResponse.json({ error: 'Could not export data.' }, { status: 500 });
  }

  return new NextResponse(toCsv(config.headers, (data ?? []) as unknown as Record<string, unknown>[]), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="datacore-${kind}.csv"`,
    },
  });
}
