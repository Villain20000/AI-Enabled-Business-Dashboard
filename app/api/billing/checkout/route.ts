/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout Session for upgrading the active org's
 * subscription. Requires the `billing:manage` permission. The resulting
 * `session.url` is returned so the client can redirect to Stripe-hosted
 * checkout. The org id is attached as `client_reference_id` so the webhook
 * can link the completed checkout back to the org.
 *
 * @module app/api/billing/checkout/route
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkCsrf } from '@/lib/security/csrf';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { supabaseServer } from '@/lib/supabase/server';
import { stripe, createCheckoutSession } from '@/lib/billing/stripe';
import { logAudit } from '@/lib/audit/log';

const Body = z.object({
  priceId: z.string().min(1),
});

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

  // Validate the request body.
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { priceId } = parsed.data;

  // Resolve the user's email from the session for the checkout customer_email.
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'No user email on session' }, { status: 400 });
  }

  const session = await createCheckoutSession({
    priceId,
    customerEmail: user.email,
    orgId: ctx.orgId,
  });
  if (!session?.url) {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'billing.checkout_started',
    resource: 'billing',
    metadata: { priceId },
  });

  return NextResponse.json({ url: session.url });
}
