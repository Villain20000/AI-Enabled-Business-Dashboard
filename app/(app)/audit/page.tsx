/**
 * Audit Log Page
 *
 * Server Component. Lists audit_logs for the active org, paginated and
 * optionally filtered by action. Resolves user emails via the admin client
 * and hands a serializable view model to the client <AuditView />.
 *
 * @module app/(app)/audit/page
 */
import { requireOrg } from '@/lib/auth/requireOrg';
import { getOrgPlan } from '@/lib/billing/limits';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AuditView } from './AuditView';

export const revalidate = 0;

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  // Membership guard — requires audit:view permission.
  const ctx = await requireOrg('audit:view');

  const { features } = await getOrgPlan(ctx.orgId);
  if (!features.audit_log) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h1 className="text-lg font-semibold text-slate-900">Audit logging is a Pro feature</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upgrade to retain and review organization audit history.
        </p>
        <a
          href="/billing"
          className="mt-4 inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          View plans
        </a>
      </div>
    );
  }

  // Next.js 15: searchParams is a Promise and must be awaited.
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const actionFilter = sp.action && sp.action.length > 0 ? sp.action : null;

  const supabase = await supabaseServer();

  // Base query for the current page of logs.
  let query = supabase
    .from('audit_logs')
    .select('id, user_id, actor_label, action, resource, metadata, created_at', {
      count: 'exact',
    })
    .eq('org_id', ctx.orgId)
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (actionFilter) query = query.eq('action', actionFilter);

  const { data: rows, count } = await query;

  // Distinct actions for the filter dropdown (unfiltered by action).
  const { data: actionRows } = await supabase
    .from('audit_logs')
    .select('action')
    .eq('org_id', ctx.orgId)
    .order('action', { ascending: true });

  const actions = Array.from(
    new Set((actionRows ?? []).map((r: { action: string }) => r.action)),
  );

  // Resolve user emails for the current page via the admin client.
  const userIds = Array.from(
    new Set((rows ?? []).map((r) => r.user_id).filter(Boolean) as string[]),
  );
  const emailMap = new Map<string, string>();
  await Promise.all(
    userIds.map(async (uid) => {
      const {
        data: { user },
      } = await supabaseAdmin.auth.admin.getUserById(uid);
      if (user?.email) emailMap.set(uid, user.email);
    }),
  );

  const logs = (rows ?? []).map((r) => ({
    id: r.id as string,
    action: r.action as string,
    resource: r.resource as string,
    metadata: r.metadata as Record<string, unknown> | null,
    createdAt: r.created_at as string,
    userEmail: (r.user_id && emailMap.get(r.user_id as string)) ?? '—',
    actorLabel: (r.actor_label as string | null) ?? null,
  }));

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <AuditView
      logs={logs}
      actions={actions}
      page={page}
      totalPages={totalPages}
    />
  );
}
