/**
 * Public v1 Metrics API — GET /api/v1/metrics
 *
 * Returns the authenticated org's KPIs, sales, and inventory data as a
 * single JSON payload. Authenticated via Bearer API key (no user session).
 *
 * @module api/v1/metrics
 */

import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/auth/apiKeyAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { recordUsage } from '@/lib/usage';
import { rateLimit } from '@/lib/security/rate-limit';
import { checkFeature } from '@/lib/billing/limits';

/** Shared CORS headers applied to every response. */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

/** OPTIONS preflight — short-circuit with 204. */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/v1/metrics
 *
 * Flow: authenticate -> rate limit -> feature gate -> fetch org data ->
 * record usage -> return aggregated payload.
 */
export async function GET(req: Request) {
  // 1. Authenticate via Bearer API key.
  const ctx = await authenticateApiKey(req.headers.get('authorization'));
  if (!ctx) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  // 2. Rate limit: 100 req/min per org.
  const rl = rateLimit({
    key: 'v1:metrics',
    identifier: ctx.orgId,
    limit: 100,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { ...CORS_HEADERS, 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  // 3. Feature gate: api_keys must be enabled for the org's plan.
  const enabled = await checkFeature(ctx.orgId, 'api_keys');
  if (!enabled) {
    return NextResponse.json(
      { error: 'API access is not enabled on your plan' },
      { status: 403, headers: CORS_HEADERS },
    );
  }

  try {
    // 4. Fetch org-scoped data via service role (no RLS context for API keys).
    const [kpisRes, salesRes, inventoryRes] = await Promise.all([
      supabaseAdmin.from('kpis').select('*').eq('org_id', ctx.orgId),
      supabaseAdmin.from('sales_data').select('*').eq('org_id', ctx.orgId),
      supabaseAdmin.from('inventory_data').select('*').eq('org_id', ctx.orgId),
    ]);

    // 5. Record usage (fire-and-forget; errors are logged internally).
    await recordUsage(ctx.orgId, 'api_call');

    // 6. Return aggregated payload.
    return NextResponse.json(
      {
        org: ctx.orgName,
        kpis: kpisRes.data ?? [],
        sales: salesRes.data ?? [],
        inventory: inventoryRes.data ?? [],
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error('v1/metrics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
