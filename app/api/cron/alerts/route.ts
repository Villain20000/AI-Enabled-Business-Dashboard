/**
 * GET|POST /api/cron/alerts
 *
 * Scheduled alert evaluation. Requires `CRON_SECRET` in the
 * `x-cron-secret` header or as a Bearer token. Configure this route in the
 * platform scheduler (for example every 15 minutes).
 *
 * @module app/api/cron/alerts/route
 */
import { NextResponse } from 'next/server';
import { runAlertsForAllOrgs } from '@/lib/alerts/run';

export const dynamic = 'force-dynamic';

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const headerSecret = req.headers.get('x-cron-secret');
  const authorization = req.headers.get('authorization');
  return headerSecret === secret || authorization === `Bearer ${secret}`;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summaries = await runAlertsForAllOrgs();
    return NextResponse.json({ ok: true, orgs: Object.keys(summaries).length, summaries });
  } catch (err) {
    console.error('cron alert run failed:', err);
    return NextResponse.json({ error: 'Alert run failed' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
