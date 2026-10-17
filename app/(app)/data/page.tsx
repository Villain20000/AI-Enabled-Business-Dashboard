/**
 * Data management page.
 *
 * Server component that loads row counts and recent imports for the active
 * organization, then delegates interactivity to DataView.
 *
 * @module app/(app)/data/page
 */
import { requireOrg } from '@/lib/auth/requireOrg';
import { supabaseServer } from '@/lib/supabase/server';
import DataView, { type ImportJobRow } from './DataView';

export const revalidate = 0;

export default async function DataPage() {
  const ctx = await requireOrg('dashboard:view');
  const supabase = await supabaseServer();

  const [
    { count: salesCount },
    { count: inventoryCount },
    { count: kpiCount },
    { data: jobRows },
  ] = await Promise.all([
    supabase.from('sales_data').select('*', { count: 'exact', head: true }).eq('org_id', ctx.orgId),
    supabase.from('inventory_data').select('*', { count: 'exact', head: true }).eq('org_id', ctx.orgId),
    supabase.from('kpis').select('*', { count: 'exact', head: true }).eq('org_id', ctx.orgId),
    supabase
      .from('import_jobs')
      .select('id, kind, status, row_count, error_count, created_at, completed_at')
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const jobs: ImportJobRow[] = (jobRows ?? []).map((job) => ({
    id: job.id,
    kind: job.kind,
    status: job.status,
    rowCount: job.row_count,
    errorCount: job.error_count,
    createdAt: job.created_at,
    completedAt: job.completed_at,
  }));

  return (
    <DataView
      role={ctx.role}
      counts={{
        sales: salesCount ?? 0,
        inventory: inventoryCount ?? 0,
        kpis: kpiCount ?? 0,
      }}
      jobs={jobs}
    />
  );
}
