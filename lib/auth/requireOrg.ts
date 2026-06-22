/**
 * requireOrg — server-side guard for protected pages + route handlers.
 *
 * Reads the active org from the `active_org_id` cookie, validates the user's
 * membership and (optionally) a required permission, and returns the context.
 * On failure throws a redirect (pages) or returns a 401/403 JSON (routes).
 *
 * @module lib/auth/requireOrg
 */
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOrgMember, can, type OrgMembership, type Permission } from './rbac';

export interface OrgContext extends OrgMembership {}

/**
 * For Server Components. Redirects to /login if unauthenticated,
 * to /onboarding if no org, or to /dashboard if not a member of the active org.
 */
export async function requireOrg(permission?: Permission): Promise<OrgContext> {
  const cookieStore = await cookies();
  const orgId = cookieStore.get('active_org_id')?.value;

  if (!orgId) {
    redirect('/onboarding');
  }

  const membership = await getOrgMember(orgId);
  if (!membership) {
    redirect('/onboarding');
  }

  if (permission && !can(membership.role, permission)) {
    redirect('/dashboard');
  }

  return membership;
}

/**
 * For Route Handlers. Returns the membership or a NextResponse error.
 */
export async function requireOrgApi(
  permission?: Permission,
): Promise<{ ctx: OrgContext } | { error: NextResponse }> {
  const cookieStore = await cookies();
  const orgId = cookieStore.get('active_org_id')?.value;

  if (!orgId) {
    return {
      error: NextResponse.json({ error: 'No active organization' }, { status: 401 }),
    };
  }

  const membership = await getOrgMember(orgId);
  if (!membership) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (permission && !can(membership.role, permission)) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ctx: membership };
}
