/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Billing Portal Session for the active org so the user
 * can manage their subscription (update card, cancel, switch plans) on
 * Stripe's hosted portal. Requires the `billing:manage` permission. The
 * org must already have a `stripe_customer_id` on file.
 *
 * @module app/api/billing/portal/route
 */
import { NextResponse } from 'next/server';
import { checkCsrf } from '@/lib/security/csrf';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { supabaseServer } from '@/lib/supabase/server';
import { stripe, createPortalSession } from '@/lib/billing/stripe';
import { logAudit } from '@/lib/audit/log';

export async function POST(req: Request) {
  // CSRF: requires x-requested-with: XMLHttpRequest from our own client.
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  // Auth + permission gate.
  const orgAccess = await requireOrgApi('billing:manage');
  if ('error' in orgAccess) return orgAccess.error;
  const { ctx } = orgAccess;

  // Stripe must be configured server-side.
  if (!stripe) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 501 });
  }

  // Look up the org's Stripe customer id (RLS-scoped via the session client).
  const supabase = await supabaseServer();
  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', ctx.orgId)
    .single();

  const customerId = org?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 });
  }

  const session = await createPortalSession({ customerId });
  if (!session?.url) {
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'billing.portal_opened',
    resource: 'billing',
    metadata: { customerId },
  });

  return NextResponse.json({ url: session.url });
}
