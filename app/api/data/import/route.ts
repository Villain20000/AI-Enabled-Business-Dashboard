/**
 * CSV data import.
 *
 * POST /api/data/import (multipart/form-data)
 * Fields: `file`, `kind` = sales | inventory | kpis
 *
 * Imports are all-or-nothing: if any row fails validation, nothing is written.
 *
 * @module app/api/data/import/route
 */
import { NextResponse } from 'next/server';
import { checkCsrf } from '@/lib/security/csrf';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { supabaseServer } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { isImportKind, validateCsv, type ImportKind } from '@/lib/data/csv';

const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** Table targeted by each import kind (used for the audit trail). */
const TABLE_BY_KIND: Record<ImportKind, string> = {
  sales: 'sales_data',
  inventory: 'inventory_data',
  kpis: 'kpis',
};

export async function POST(req: Request) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const guard = await requireOrgApi('data:edit');
  if ('error' in guard) return guard.error;
  const { ctx } = guard;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const rawKind = form.get('kind');
  const kind = typeof rawKind === 'string' ? rawKind : '';
  if (!isImportKind(kind)) {
    return NextResponse.json({ error: 'kind must be sales, inventory, or kpis' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A CSV file is required' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'The CSV file is empty' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'CSV files must be 2 MB or smaller' }, { status: 413 });
  }

  const text = await file.text();
  const validated = validateCsv(kind, text);
  if (!validated.ok) {
    return NextResponse.json(
      {
        error: 'CSV validation failed',
        errors: validated.errors.slice(0, 50),
      },
      { status: 400 },
    );
  }

  const supabase = await supabaseServer();

  // Insert per kind so each table name stays paired with its own row type.
  // `validated.kind` is the discriminant of the validation result, so the data
  // array is narrowed along with it.
  let insertError: { message: string } | null = null;
  let rowCount = 0;
  if (validated.kind === 'sales') {
    const rows = validated.data.map((row) => ({ ...row, org_id: ctx.orgId }));
    rowCount = rows.length;
    ({ error: insertError } = await supabase.from('sales_data').insert(rows));
  } else if (validated.kind === 'inventory') {
    const rows = validated.data.map((row) => ({ ...row, org_id: ctx.orgId }));
    rowCount = rows.length;
    ({ error: insertError } = await supabase.from('inventory_data').insert(rows));
  } else {
    const rows = validated.data.map((row) => ({ ...row, org_id: ctx.orgId }));
    rowCount = rows.length;
    ({ error: insertError } = await supabase.from('kpis').insert(rows));
  }

  if (insertError) {
    console.error('data import insert failed:', insertError);
    return NextResponse.json(
      { error: 'Could not save the imported rows. Please try again.' },
      { status: 500 },
    );
  }

  const { data: source } = await supabase
    .from('data_sources')
    .insert({
      org_id: ctx.orgId,
      name: file.name,
      kind: 'csv',
      status: 'active',
      last_synced_at: new Date().toISOString(),
      created_by: ctx.userId,
    })
    .select('id')
    .single();  const { data: job } = await supabase
    .from('import_jobs')
    .insert({
      org_id: ctx.orgId,
      data_source_id: source?.id ?? null,
      kind: validated.kind,
      status: 'completed',
      row_count: rowCount,
      error_count: 0,
      created_by: ctx.userId,
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'data.import',
    resource: TABLE_BY_KIND[validated.kind],
    metadata: { kind: validated.kind, fileName: file.name, rows: rowCount, jobId: job?.id },
  });

  return NextResponse.json({
    ok: true,
    imported: rowCount,
    kind: validated.kind,
    jobId: job?.id ?? null,
  });
}
