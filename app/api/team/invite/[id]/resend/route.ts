/**
 * Resend a pending team invitation.
 *
 * POST /api/team/invite/[id]/resend
 * Requires `team:manage`, CSRF protection, and returns the invite URL so the
 * admin can copy it if email delivery is unavailable.
 *
 * @module app/api/team/invite/[id]/resend
 */
import { NextResponse } from 'next/server';
import { checkCsrf } from '@/lib/security/csrf';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const guard = await requireOrgApi('team:manage');
  if ('error' in guard) return guard.error;
  const { ctx } = guard;

  const { id } = await params;
  const { data: invite } = await supabaseAdmin
    .from('organization_invitations')
    .select('id, email, role, token, expires_at, status')
    .eq('id', id)
    .eq('org_id', ctx.orgId)
    .eq('status', 'pending')
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: 'Pending invitation not found.' }, { status: 404 });
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await supabaseAdmin
      .from('organization_invitations')
      .update({ status: 'expired' })
      .eq('id', invite.id);
    return NextResponse.json({ error: 'This invitation has expired. Create a new one.' }, { status: 409 });
  }

  const inviteUrl = `${new URL(req.url).origin}/accept-invite/${invite.token}`;
  let emailSent = false;
  try {
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(invite.email, {
      redirectTo: inviteUrl,
    });
    if (error) throw error;
    emailSent = true;
  } catch (err) {
    console.error('invite resend failed:', err);
  }

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'team.resend_invite',
    resource: 'organization_invitations',
    metadata: { inviteId: invite.id, email: invite.email, emailSent },
  });

  return NextResponse.json({ ok: true, inviteUrl, emailSent });
}
