/**
 * POST /api/team/transfer-owner
 * Transfer ownership to another member. Owner-only.
 *
 * @module app/api/team/transfer-owner/route
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkCsrf } from '@/lib/security/csrf';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';

const Body = z.object({ userId: z.string().uuid() });

export async function POST(req: Request) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const guard = await requireOrgApi('org:manage');
  if ('error' in guard) return guard.error;
  const { ctx } = guard;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid member id is required.' }, { status: 400 });
  }
  if (parsed.data.userId === ctx.userId) {
    return NextResponse.json({ error: 'You already own this organization.' }, { status: 400 });
  }

  const { data: target } = await supabaseAdmin
    .from('organization_members')
    .select('user_id, role')
    .eq('org_id', ctx.orgId)
    .eq('user_id', parsed.data.userId)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  }
  if (target.role === 'owner') {
    return NextResponse.json({ error: 'That member is already the owner.' }, { status: 409 });
  }

  // The partial unique index allows only one owner, so demote the current
  // owner before promoting the target. Roll back if the second write fails.
  const { error: demoteError } = await supabaseAdmin
    .from('organization_members')
    .update({ role: 'admin' })
    .eq('org_id', ctx.orgId)
    .eq('user_id', ctx.userId);

  if (demoteError) {
    return NextResponse.json({ error: 'Could not transfer ownership.' }, { status: 500 });
  }

  const { error: promoteError } = await supabaseAdmin
    .from('organization_members')
    .update({ role: 'owner' })
    .eq('org_id', ctx.orgId)
    .eq('user_id', parsed.data.userId);

  if (promoteError) {
    await supabaseAdmin
      .from('organization_members')
      .update({ role: 'owner' })
      .eq('org_id', ctx.orgId)
      .eq('user_id', ctx.userId);
    return NextResponse.json({ error: 'Could not transfer ownership.' }, { status: 500 });
  }

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'team.transfer_owner',
    resource: 'organization_members',
    metadata: { from: ctx.userId, to: parsed.data.userId },
  });

  return NextResponse.json({ ok: true });
}
