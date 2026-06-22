/**
 * Org Switch API — POST /api/org/switch
 *
 * Sets the `active_org_id` cookie after validating that the authenticated
 * user is a member of the target org. The cookie drives server-side org
 * resolution (requireOrg / requireOrgApi) and the OrgProvider client state.
 *
 * @module app/api/org/switch
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkCsrf } from '@/lib/security/csrf';
import { getOrgMember } from '@/lib/auth/rbac';

export async function POST(req: Request) {
  // CSRF: requires the X-Requested-With header set by our own fetch calls.
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const { orgId } = (await req.json()) as { orgId?: string };
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  }

  // Validate membership before accepting the switch.
  const membership = await getOrgMember(orgId);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set('active_org_id', orgId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return NextResponse.json({ ok: true });
}
