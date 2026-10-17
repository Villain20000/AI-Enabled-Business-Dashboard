/**
 * GET /api/alerts/events
 * Recent alert events for the active organization.
 *
 * @module app/api/alerts/events/route
 */
import { NextResponse } from 'next/server';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET() {
  const guard = await requireOrgApi('alerts:manage');
  if ('error' in guard) return guard.error;

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('alert_events')
    .select('id, rule_id, status, channel, destination, triggered_value, error, created_at, delivered_at, alert_rules(kpi)')
    .eq('org_id', guard.ctx.orgId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'Could not load alert history.' }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}
