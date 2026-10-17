/**
 * Validate an invitation token without consuming it.
 *
 * GET /api/team/invite/validate?token=...
 * Requires an authenticated session and only returns details when the
 * signed-in user is the invited email address.
 *
 * @module app/api/team/invite/validate
 */
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to view this invitation.' }, { status: 401 });
  }

  const token = new URL(req.url).searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing invitation token.' }, { status: 400 });
  }

  const { data: invite } = await supabaseAdmin
    .from('organization_invitations')
    .select('id, org_id, email, role, expires_at, status, organization:organizations(name)')
    .eq('token', token)
    .eq('status', 'pending')
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await supabaseAdmin
      .from('organization_invitations')
      .update({ status: 'expired' })
      .eq('id', invite.id);
    return NextResponse.json({ error: 'This invitation has expired.' }, { status: 404 });
  }

  if ((user.email ?? '').toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'This invitation was sent to a different email address.' },
      { status: 403 },
    );
  }

  const org = invite.organization as unknown as { name?: string } | null;

  return NextResponse.json({
    invitation: {
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expires_at,
      orgName: org?.name ?? 'the organization',
    },
  });
}
