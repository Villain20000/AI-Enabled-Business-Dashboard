/**
 * Load sample data into an empty organization.
 *
 * POST /api/data/sample
 * This is an explicit action so the dashboard never silently substitutes
 * global mock data for a real tenant.
 *
 * @module app/api/data/sample/route
 */
import { NextResponse } from 'next/server';
import { checkCsrf } from '@/lib/security/csrf';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { supabaseServer } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { salesData, inventoryData, kpis } from '@/lib/mock-data';

export async function POST(req: Request) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const guard = await requireOrgApi('data:edit');
  if ('error' in guard) return guard.error;
  const { ctx } = guard;

  const supabase = await supabaseServer();
  const [{ count: salesCount }, { count: inventoryCount }, { count: kpiCount }] = await Promise.all([
    supabase.from('sales_data').select('*', { count: 'exact', head: true }).eq('org_id', ctx.orgId),
    supabase.from('inventory_data').select('*', { count: 'exact', head: true }).eq('org_id', ctx.orgId),
    supabase.from('kpis').select('*', { count: 'exact', head: true }).eq('org_id', ctx.orgId),
  ]);

  if ((salesCount ?? 0) + (inventoryCount ?? 0) + (kpiCount ?? 0) > 0) {
    return NextResponse.json(
      { error: 'This organization already has data. Delete or export it before loading the sample.' },
      { status: 409 },
    );
  }

  const [{ error: salesError }, { error: inventoryError }, { error: kpiError }] = await Promise.all([
    supabase.from('sales_data').insert(salesData.map((row) => ({ ...row, org_id: ctx.orgId }))),
    supabase.from('inventory_data').insert(inventoryData.map((row) => ({ ...row, org_id: ctx.orgId }))),
    supabase.from('kpis').insert(kpis.map((row) => ({ ...row, org_id: ctx.orgId }))),
  ]);

  if (salesError || inventoryError || kpiError) {
    console.error('sample data insert failed:', { salesError, inventoryError, kpiError });
    return NextResponse.json({ error: 'Could not load sample data.' }, { status: 500 });
  }

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'data.sample_loaded',
    resource: 'data',
    metadata: { sales: salesData.length, inventory: inventoryData.length, kpis: kpis.length },
  });

  return NextResponse.json({ ok: true });
}
