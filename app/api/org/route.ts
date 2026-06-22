/**
 * Org API — GET /api/org, POST /api/org
 *
 * GET  : returns every organization the authenticated user belongs to.
 * POST : creates a new organization, adds the caller as `owner`, sets the
 *        `active_org_id` cookie, and records an audit entry. Uses the
 *        service-role admin client for the inserts because RLS on
 *        organization_members requires an existing membership to write
 *        (chicken-and-egg on first org creation).
 *
 * @module app/api/org
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkCsrf } from '@/lib/security/csrf';
import { listUserOrgs } from '@/lib/auth/rbac';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';

/** Slugify a name: lowercase, non-alphanumerics -> hyphens, trimmed. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET() {
  const orgs = await listUserOrgs();
  return NextResponse.json({ orgs });
}

export async function POST(req: Request) {
  // CSRF: requires the X-Requested-With header set by our own fetch calls.
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const { name } = (await req.json()) as { name?: string };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // Resolve the authenticated user (RLS-scoped client).
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 8)}`;

  // Insert the org + owner membership with the service-role client (bypasses
  // RLS) so the first membership can be written before any policy can match.
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({ name: name.trim(), slug })
    .select()
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }

  const { error: memberError } = await supabaseAdmin
    .from('organization_members')
    .insert({ org_id: org.id, user_id: user.id, role: 'owner' });

  if (memberError) {
    // Roll back the org row so we don't leave an orphaned organization.
    await supabaseAdmin.from('organizations').delete().eq('id', org.id);
    return NextResponse.json({ error: 'Failed to add owner membership' }, { status: 500 });
  }

  // Activate the newly created org immediately.
  const cookieStore = await cookies();
  cookieStore.set('active_org_id', org.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  // Best-effort audit trail.
  await logAudit({
    orgId: org.id,
    userId: user.id,
    action: 'org.create',
    resource: `organization:${org.id}`,
    metadata: { name: org.name, slug: org.slug },
  });

  return NextResponse.json({ org }, { status: 201 });
}
