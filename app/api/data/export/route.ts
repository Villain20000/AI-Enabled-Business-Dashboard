/**
 * GET /api/data/export?kind=sales|inventory|kpis
 * Export the active organization's rows as CSV.
 *
 * @module app/api/data/export/route
 */
import { NextResponse } from 'next/server';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { supabaseServer } from '@/lib/supabase/server';
import { isImportKind, toCsv, type ImportKind } from '@/lib/data/csv';

/** Export columns, in the order they are written to the CSV. */
const EXPORT_HEADERS: Record<ImportKind, string[]> = {
  sales: ['month', 'sales', 'target'],
  inventory: ['product', 'stock', 'status'],
  kpis: ['title', 'value', 'change', 'trend'],
};

export async function GET(req: Request) {
  const guard = await requireOrgApi('dashboard:view');
  if ('error' in guard) return guard.error;

  const kind = new URL(req.url).searchParams.get('kind') ?? 'sales';
  if (!isImportKind(kind)) {
    return NextResponse.json({ error: 'Unknown export kind' }, { status: 400 });
  }

  const orgId = guard.ctx.orgId;
  const headers = EXPORT_HEADERS[kind];
  const supabase = await supabaseServer();

  // Each branch keeps the table name and the selected columns literal so the
  // result stays typed. A dynamic table name would collapse the row type.
  let rows: Record<string, unknown>[] = [];
  let selectError: { message: string } | null = null;

  if (kind === 'sales') {
    const { data, error } = await supabase
      .from('sales_data')
      .select('month, sales, target')
      .eq('org_id', orgId);
    rows = data ?? [];
    selectError = error;
  } else if (kind === 'inventory') {
    const { data, error } = await supabase
      .from('inventory_data')
      .select('product, stock, status')
      .eq('org_id', orgId);
    rows = data ?? [];
    selectError = error;
  } else {
    const { data, error } = await supabase
      .from('kpis')
      .select('title, value, change, trend')
      .eq('org_id', orgId);
    rows = data ?? [];
    selectError = error;
  }

  if (selectError) {
    return NextResponse.json({ error: 'Could not export data.' }, { status: 500 });
  }

  return new NextResponse(toCsv(headers, rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="datacore-${kind}.csv"`,
    },
  });
}
