/**
 * Team Member API — PATCH/DELETE /api/team/[userId]
 *
 * PATCH changes a member's role (admin/member/viewer). DELETE removes a
 * member from the org. Both require `team:manage` and are CSRF-guarded.
 * The owner is protected: their role cannot be changed and they cannot be
 * removed (prevents orphaned orgs). All mutations are audit-logged.
 *
 * @module app/api/team/[userId]
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { checkCsrf } from '@/lib/security/csrf';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';
import type { OrgRole } from '@/lib/auth/rbac';

const PatchBody = z.object({ role: z.enum(['admin', 'member', 'viewer']) });

/** Shared guard: CSRF + RBAC + load the target member's current role. */
async function authorize(req: Request, userId: string) {
  const csrfError = checkCsrf(req);
  if (csrfError) return { error: csrfError } as const;

  const guard = await requireOrgApi('team:manage');
  if ('error' in guard) return { error: guard.error } as const;

  // Fetch the target membership within this org.
  const { data: target } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('org_id', guard.ctx.orgId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!target) {
    return {
      error: NextResponse.json({ error: 'Member not found.' }, { status: 404 }),
    } as const;
  }

  return { ctx: guard.ctx, targetRole: target.role as OrgRole } as const;
}

/** PATCH — change role. Owner is immutable. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const auth = await authorize(req, userId);
  if ('error' in auth) return auth.error;
  const { ctx, targetRole } = auth;

  if (targetRole === 'owner') {
    return NextResponse.json({ error: 'The owner role cannot be changed.' }, { status: 403 });
  }

  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }
  const { role } = parsed.data;

  const { error } = await supabaseAdmin
    .from('organization_members')
    .update({ role })
    .eq('org_id', ctx.orgId)
    .eq('user_id', userId);
  if (error) {
    return NextResponse.json({ error: 'Failed to update role.' }, { status: 500 });
  }

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'team.update_role',
    resource: 'organization_members',
    metadata: { targetUserId: userId, from: targetRole, to: role },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE — remove member. Owner is protected. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const auth = await authorize(req, userId);
  if ('error' in auth) return auth.error;
  const { ctx, targetRole } = auth;

  if (targetRole === 'owner') {
    return NextResponse.json({ error: 'The owner cannot be removed.' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('organization_members')
    .delete()
    .eq('org_id', ctx.orgId)
    .eq('user_id', userId);
  if (error) {
    return NextResponse.json({ error: 'Failed to remove member.' }, { status: 500 });
  }

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'team.remove',
    resource: 'organization_members',
    metadata: { targetUserId: userId, role: targetRole },
  });

  return NextResponse.json({ ok: true });
}
