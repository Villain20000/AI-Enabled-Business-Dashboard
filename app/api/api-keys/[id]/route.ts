/**
 * API Keys — Revoke endpoint (DELETE /api/api-keys/[id])
 *
 * Marks a key as revoked by setting revoked_at; the row is retained for audit.
 * Validates ownership (key must belong to the caller's org). CSRF-protected.
 *
 * @module ApiKeysRevokeRoute
 */
import { NextResponse } from 'next/server';
import { checkCsrf } from '@/lib/security/csrf';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { logAudit } from '@/lib/audit/log';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // CSRF: requires the custom x-requested-with header from our own client.
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  // Auth + permission gate.
  const auth = await requireOrgApi('apikeys:manage');
  if ('error' in auth) return auth.error;
  const { ctx } = auth;

  // Await dynamic params (Next.js 15 async params).
  const { id } = await params;

  // Ownership check: the key must belong to the caller's org. Also refuse to
  // "revoke" an already-revoked key (idempotency guard returns 404 here).
  const { data: key } = await supabaseAdmin
    .from('api_keys')
    .select('id, name, revoked_at')
    .eq('id', id)
    .eq('org_id', ctx.orgId)
    .is('revoked_at', null)
    .single();

  if (!key) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  }

  // Soft-delete: set revoked_at, keep the row for audit history.
  const { error } = await supabaseAdmin
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 });
  }

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'apikey.revoke',
    resource: `api_keys/${id}`,
    metadata: { name: key.name },
  });

  return NextResponse.json({ ok: true });
}
