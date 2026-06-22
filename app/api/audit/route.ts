/**
 * Audit Ingestion API Route
 *
 * POST /api/audit — records an audit entry for the authenticated member's own
 * action. Any org member may write entries for their own actions (no specific
 * permission beyond membership). Protected by CSRF + zod validation.
 *
 * @module app/api/audit/route
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkCsrf } from '@/lib/security/csrf';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { logAudit } from '@/lib/audit/log';

/** Request body schema. */
const AuditBody = z.object({
  action: z.string().min(1),
  resource: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  // CSRF: requires the x-requested-with: XMLHttpRequest header.
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  // Membership guard — any member may record their own actions.
  const guard = await requireOrgApi();
  if ('error' in guard) return guard.error;
  const { ctx } = guard;

  // Validate body.
  const parsed = AuditBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { action, resource, metadata } = parsed.data;

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action,
    resource,
    metadata,
  });

  return NextResponse.json({ ok: true });
}
