/**
 * POST /api/billing/webhook
 *
 * Stripe webhook receiver. Verifies the event signature using the raw
 * request body + STRIPE_WEBHOOK_SECRET, then mutates the org's billing
 * state via the service-role client (no user session exists for webhooks).
 *
 * Handled events:
 *   - checkout.session.completed      -> set customer id + plan
 *   - customer.subscription.updated   -> update plan
 *   - customer.subscription.deleted   -> revert to free
 *   - invoice.paid                    -> no-op (200)
 *
 * @module app/api/billing/webhook/route
 */
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/billing/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import { logAudit } from '@/lib/audit/log';

// The webhook reads the raw body via req.text(); this requires the Node.js
// runtime (the Edge runtime would force streaming/JSON parsing instead).
export const runtime = 'nodejs';

/**
 * Map a Stripe price id back to one of our PlanId values by comparing
 * against each plan's `stripePriceId`. Falls back to 'pro' when no match
 * is found (a new/unknown paid price should never silently downgrade to
 * free, and 'pro' is the safer default for a paid subscription).
 */
function planFromPriceId(priceId: string | null | undefined): PlanId {
  if (!priceId) return 'pro';
  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceId && plan.stripePriceId === priceId) {
      return plan.id;
    }
  }
  return 'pro';
}

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 501 });
  }

  // Stripe signs the raw body, so we must read it as text (not JSON).
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || '',
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return NextResponse.json({ error: `Webhook signature failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.client_reference_id;
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscription =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

        // Determine the plan from the subscription's first item price.
        let planId: PlanId = 'pro';
        if (subscription) {
          const sub = await stripe.subscriptions.retrieve(subscription);
          const priceId = sub.items.data[0]?.price?.id;
          planId = planFromPriceId(priceId);
        }

        if (orgId) {
          await supabaseAdmin
            .from('organizations')
            .update({
              stripe_customer_id: customerId,
              subscription_plan: planId,
            })
            .eq('id', orgId);

          await logAudit({
            orgId,
            userId: 'stripe-webhook',
            action: 'billing.subscription_created',
            resource: 'billing',
            metadata: { customerId, planId, subscriptionId: subscription },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        const priceId = sub.items.data[0]?.price?.id;
        const planId = planFromPriceId(priceId);

        if (customerId) {
          await supabaseAdmin
            .from('organizations')
            .update({ subscription_plan: planId })
            .eq('stripe_customer_id', customerId);

          await logAudit({
            orgId: customerId,
            userId: 'stripe-webhook',
            action: 'billing.subscription_updated',
            resource: 'billing',
            metadata: { customerId, planId, subscriptionId: sub.id },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;

        if (customerId) {
          await supabaseAdmin
            .from('organizations')
            .update({ subscription_plan: 'free' })
            .eq('stripe_customer_id', customerId);

          await logAudit({
            orgId: customerId,
            userId: 'stripe-webhook',
            action: 'billing.subscription_cancelled',
            resource: 'billing',
            metadata: { customerId, subscriptionId: sub.id },
          });
        }
        break;
      }

      case 'invoice.paid':
        // No-op for now; future: record invoice history / dunning state.
        break;

      default:
        // Unhandled event types are acknowledged so Stripe doesn't retry.
        break;
    }
  } catch (err) {
    // Log but still 200 so Stripe doesn't endlessly retry a poison event.
    // Surface failures to server logs for investigation.
    console.error('billing webhook handler failed:', err);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
