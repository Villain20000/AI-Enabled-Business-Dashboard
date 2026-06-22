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
import { supabaseAdmin } from '@/lib/supabase/admin';
import TeamView, { type TeamViewProps } from './TeamView';

// Always render fresh — the roster reflects live membership/invite state.
export const revalidate = 0;

export default async function TeamPage() {
  const ctx = await requireOrg('team:manage');

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
      role: m.role,
      createdAt: m.created_at,
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
    role: i.role,
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
