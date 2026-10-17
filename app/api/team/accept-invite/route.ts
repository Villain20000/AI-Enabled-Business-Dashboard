/**
 * Team Accept-Invite API — POST /api/team/accept-invite
 *
 * Redeems a pending invitation token for the authenticated user. No
 * `team:manage` permission is required (the caller is the invitee, not an
 * admin), but the user must be logged in. On success the user is added to
 * the org as a member via the service-role client (bypassing RLS), the
 * invitation is marked accepted, and the `active_org_id` cookie is set so
 * subsequent requests scope to the joined org. Audit-logged.
 *
 * @module app/api/team/accept-invite
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { checkCsrf } from '@/lib/security/csrf';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';

const Body = z.object({ token: z.string().min(1) });

export async function POST(req: Request) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  // The caller must be an authenticated user (the invitee).
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'You must be logged in to accept this invite.' },
      { status: 401 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { token } = parsed.data;

  // Look up the invitation: must be pending and not expired.
  const { data: invite } = await supabaseAdmin
    .from('organization_invitations')
    .select('id, org_id, email, role, expires_at, status')
    .eq('token', token)
    .eq('status', 'pending')
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    // Mark expired so it stops counting toward seat usage.
    await supabaseAdmin
      .from('organization_invitations')
      .update({ status: 'expired' })
      .eq('id', invite.id);
    return NextResponse.json({ error: 'This invitation has expired.' }, { status: 404 });
  }

  // Critical authorization check: the signed-in user must be the invitee.
  // A leaked token must not let an arbitrary account join the organization.
  if ((user.email ?? '').toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'This invitation was sent to a different email address.' },
      { status: 403 },
    );
  }

  // If the user is already a member, do not overwrite their current role
  // (an old invite must not be able to demote an admin).
  const { data: existingMember } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('org_id', invite.org_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingMember) {
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({ org_id: invite.org_id, user_id: user.id, role: invite.role });
    if (memberError) {
      return NextResponse.json({ error: 'Failed to add you to the organization.' }, { status: 500 });
    }
  }

  // Mark the invitation accepted.
  await supabaseAdmin
    .from('organization_invitations')
    .update({ status: 'accepted' })
    .eq('id', invite.id);

  // Set the active org cookie so the user lands inside the joined org.
  const cookieStore = await cookies();
  cookieStore.set('active_org_id', invite.org_id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });

  await logAudit({
    orgId: invite.org_id,
    userId: user.id,
    action: 'team.accept_invite',
    resource: 'organization_members',
    metadata: { email: invite.email, role: invite.role, alreadyMember: Boolean(existingMember) },
  });

  return NextResponse.json({ ok: true, orgId: invite.org_id });
}
