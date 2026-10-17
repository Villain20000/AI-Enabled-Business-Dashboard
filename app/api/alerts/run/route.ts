/**
 * POST /api/alerts/run
 * Manually evaluate the active organization's alert rules.
 *
 * @module app/api/alerts/run/route
 */
import { NextResponse } from 'next/server';
import { checkCsrf } from '@/lib/security/csrf';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { runAlertsForOrg } from '@/lib/alerts/run';

export async function POST(req: Request) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const guard = await requireOrgApi('alerts:manage');
  if ('error' in guard) return guard.error;

  try {
    const summary = await runAlertsForOrg(guard.ctx.orgId);
    return NextResponse.json(summary);
  } catch (err) {
    console.error('manual alert run failed:', err);
    return NextResponse.json({ error: 'Could not evaluate alerts.' }, { status: 500 });
  }
}
