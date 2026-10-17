/**
 * Team Page — server entry point.
 *
 * Resolves the active org context (requires `team:manage` to administer, but
 * any member can view the roster), then fetches the org's members + pending
 * invitations. Member emails live in Supabase Auth (auth.users), which is not
 * exposed via RLS, so we resolve them server-side with the service-role admin
 * client and pass a flattened `{ userId, email, role, createdAt }` list down
 * to the client <TeamView /> component.
 *
 * @module app/(app)/team/page
 */
import { requireOrg } from '@/lib/auth/requireOrg';
import { parseOrgRole } from '@/lib/auth/roles';
import { getOrgPlan } from '@/lib/billing/limits';
import { supabaseAdmin } from '@/lib/supabase/admin';
import TeamView, { type TeamViewProps } from './TeamView';

// Always render fresh — the roster reflects live membership/invite state.
export const revalidate = 0;

export default async function TeamPage() {
  const ctx = await requireOrg('team:manage');

  // Team management is a paid-plan feature. Seat limits also block free orgs,
  // but hiding the page keeps the plan boundary explicit.
  const { features } = await getOrgPlan(ctx.orgId);
  if (!features.team) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h1 className="text-lg font-semibold text-slate-900">Team management is a Pro feature</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upgrade to invite teammates and manage roles.
        </p>
        <a
          href="/billing"
          className="mt-4 inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          View plans
        </a>
      </div>
    );
  }

  // 1. Fetch all membership rows for this org.
  const { data: memberRows } = await supabaseAdmin
    .from('organization_members')
    .select('user_id, role, created_at')
    .eq('org_id', ctx.orgId);

  // 2. Resolve each member's email via the Auth admin API (bypasses RLS).
  const members: TeamViewProps['members'] = [];
  for (const m of memberRows ?? []) {
    let email = '';
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
      email = data?.user?.email ?? '';
    } catch {
      // Auth lookup is best-effort; surface the row even if email is missing.
      email = '';
    }
    members.push({
      userId: m.user_id,
      email,
      // The column is check-constrained, but fall back to the least-privileged
      // role rather than trusting an unexpected value.
      role: parseOrgRole(m.role) ?? 'viewer',
      createdAt: m.created_at ?? '',
    });
  }

  // 3. Fetch pending invitations for this org.
  const { data: inviteRows } = await supabaseAdmin
    .from('organization_invitations')
    .select('id, email, role, expires_at')
    .eq('org_id', ctx.orgId)
    .eq('status', 'pending');

  const invitations: TeamViewProps['invitations'] = (inviteRows ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: parseOrgRole(i.role) ?? 'viewer',
    expiresAt: i.expires_at,
  }));

  return (
    <TeamView
      orgId={ctx.orgId}
      role={ctx.role}
      members={members}
      invitations={invitations}
    />
  );
}
