/**
 * Team Revoke Invite API — DELETE /api/team/invite/[id]
 *
 * Revokes a pending invitation. We mark the row `revoked` (rather than
 * hard-deleting) so the audit trail + seat-usage history remain intact.
 * Requires `team:manage` and is CSRF-guarded. Audit-logged.
 *
 * @module app/api/team/invite/[id]
 */
import { NextResponse } from 'next/server';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { checkCsrf } from '@/lib/security/csrf';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const guard = await requireOrgApi('team:manage');
  if ('error' in guard) return guard.error;
  const { ctx } = guard;

  const { id } = await params;

  // Scope the update to this org so a token from another org can't be
  // revoked by an admin of a different org.
  const { data: invite, error: fetchError } = await supabaseAdmin
    .from('organization_invitations')
    .select('id, email, role')
    .eq('id', id)
    .eq('org_id', ctx.orgId)
    .eq('status', 'pending')
    .maybeSingle();

  if (fetchError || !invite) {
    return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('organization_invitations')
    .update({ status: 'revoked' })
    .eq('id', id)
    .eq('org_id', ctx.orgId);
  if (error) {
    return NextResponse.json({ error: 'Failed to revoke invitation.' }, { status: 500 });
  }

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'team.revoke_invite',
    resource: 'organization_invitations',
    metadata: { inviteId: id, email: invite.email, role: invite.role },
  });

  return NextResponse.json({ ok: true });
}
