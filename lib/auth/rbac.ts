/**
 * RBAC — server-side membership resolution.
 *
 * Pure role/permission constants + helpers live in lib/auth/roles.ts (no
 * server imports) so client components can import them safely. This module
 * re-exports those plus the server-only membership functions.
 *
 * @module lib/auth/rbac
 */
import { supabaseServer } from '@/lib/supabase/server';
import type { OrgRole } from './roles';

export * from './roles';
export type { OrgRole };

export interface OrgMembership {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: OrgRole;
  userId: string;
  userEmail: string;
}

/**
 * Resolve the authenticated user's membership in a specific org.
 * Returns null if not authenticated or not a member of the org.
 */
export async function getOrgMember(orgId: string): Promise<OrgMembership | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role, organization:organizations(id, name, slug)')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single();

  if (!membership || !membership.organization) return null;

  const org = membership.organization as unknown as { id: string; name: string; slug: string };
  return {
    orgId: org.id,
    orgName: org.name,
    orgSlug: org.slug,
    role: membership.role as OrgRole,
    userId: user.id,
    userEmail: user.email ?? '',
  };
}

/**
 * List all orgs the current user belongs to (for the org switcher).
 */
export async function listUserOrgs(): Promise<
  { id: string; name: string; slug: string; role: OrgRole }[]
> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('organization_members')
    .select('role, organization:organizations(id, name, slug)')
    .eq('user_id', user.id);

  return (data ?? [])
    .map((m: any) => ({
      id: m.organization?.id,
      name: m.organization?.name,
      slug: m.organization?.slug,
      role: m.role as OrgRole,
    }))
    .filter((o) => o.id);
}
