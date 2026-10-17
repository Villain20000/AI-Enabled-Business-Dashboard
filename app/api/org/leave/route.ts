/**
 * POST /api/org/leave
 * Remove the current user from the active organization. Owners must transfer
 * ownership or delete the organization first.
 *
 * @module app/api/org/leave/route
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkCsrf } from '@/lib/security/csrf';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';

export async function POST(req: Request) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const guard = await requireOrgApi();
  if ('error' in guard) return guard.error;
  const { ctx } = guard;

  if (ctx.role === 'owner') {
    return NextResponse.json(
      { error: 'Transfer ownership to another member before leaving.' },
      { status: 403 },
    );
  }

  const { error } = await supabaseAdmin
    .from('organization_members')
    .delete()
    .eq('org_id', ctx.orgId)
    .eq('user_id', ctx.userId);

  if (error) {
    return NextResponse.json({ error: 'Could not leave the organization.' }, { status: 500 });
  }

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'org.leave',
    resource: 'organization_members',
    metadata: { role: ctx.role },
  });

  const cookieStore = await cookies();
  cookieStore.delete('active_org_id');

  return NextResponse.json({ ok: true });
}
