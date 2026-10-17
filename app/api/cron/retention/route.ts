/**
 * GET|POST /api/cron/retention
 *
 * Deletes audit rows older than each organization's plan retention window.
 * Configure with `CRON_SECRET` in `x-cron-secret` or as a Bearer token.
 *
 * @module app/api/cron/retention/route
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPlan } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (
    req.headers.get('x-cron-secret') === secret ||
    req.headers.get('authorization') === `Bearer ${secret}`
  );
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: orgs, error } = await supabaseAdmin
    .from('organizations')
    .select('id, subscription_plan');

  if (error) {
    return NextResponse.json({ error: 'Could not load organizations' }, { status: 500 });
  }

  let deleted = 0;
  for (const org of orgs ?? []) {
    const plan = getPlan(org.subscription_plan);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - plan.auditRetentionDays);

    const { count } = await supabaseAdmin
      .from('audit_logs')
      .delete({ count: 'exact' })
      .eq('org_id', org.id)
      .lt('created_at', cutoff.toISOString());

    deleted += count ?? 0;
  }

  return NextResponse.json({ ok: true, orgs: orgs?.length ?? 0, deleted });
}

export const GET = handle;
export const POST = handle;
