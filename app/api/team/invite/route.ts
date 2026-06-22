/**
 * Team Invite API — POST /api/team/invite
 *
 * Creates a pending invitation row for an email + role, enforcing the org's
 * seat limit (active members + pending invites). Generates a random token
 * used in the accept URL. Optionally triggers Supabase's invite-by-email so
 * the recipient gets a magic link scoped to /accept-invite/<token>; in dev
 * the invite URL is returned directly for convenience. Audit-logged.
 *
 * @module app/api/team/invite
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { checkCsrf } from '@/lib/security/csrf';
import { getOrgPlan } from '@/lib/billing/limits';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';

const Body = z.object({
  email: z.string().email(),
  role: z.enum(['member', 'admin']),
});

export async function POST(req: Request) {
  // CSRF: requires the x-requested-with header set by our own client.
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  // RBAC: must be able to manage the team.
  const guard = await requireOrgApi('team:manage');
  if ('error' in guard) return guard.error;
  const { ctx } = guard;

  // Validate body.
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }
  const { email, role } = parsed.data;

  // Seat-limit enforcement: active members + pending invites vs plan seats.
  const { plan } = await getOrgPlan(ctx.orgId);
  const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
    supabaseAdmin
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', ctx.orgId),
    supabaseAdmin
      .from('organization_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', ctx.orgId)
      .eq('status', 'pending'),
  ]);

  const used = (memberCount ?? 0) + (inviteCount ?? 0);
  if (used >= plan.seats) {
    return NextResponse.json(
      { error: `Seat limit reached (${plan.seats} seats on the ${plan.name} plan).` },
      { status: 403 },
    );
  }

  // Reject duplicate pending invites for the same email in this org.
  const { data: existing } = await supabaseAdmin
    .from('organization_invitations')
    .select('id')
    .eq('org_id', ctx.orgId)
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'A pending invitation already exists for this email.' }, { status: 409 });
  }

  // Generate token + expiry (7 days) and persist the invitation.
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const origin = new URL(req.url).origin;
  const inviteUrl = `${origin}/accept-invite/${token}`;

  const { error: insertError } = await supabaseAdmin.from('organization_invitations').insert({
    org_id: ctx.orgId,
    email: email.toLowerCase(),
    role,
    token,
    expires_at: expiresAt,
    status: 'pending',
  });
  if (insertError) {
    return NextResponse.json({ error: 'Failed to create invitation.' }, { status: 500 });
  }

  // Best-effort: send the invite email via Supabase Auth. The redirect URL
  // carries our token so /accept-invite can resolve the org + role. Failures
  // are non-fatal — the invitation row is the source of truth.
  try {
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteUrl,
    });
  } catch (err) {
    console.error('invite email failed:', err);
  }

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'team.invite',
    resource: 'organization_invitations',
    metadata: { email: email.toLowerCase(), role },
  });

  return NextResponse.json({ ok: true, inviteUrl });
}
