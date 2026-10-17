/**
 * POST /api/billing/webhook
 *
 * Stripe webhook receiver. Verifies the event signature using the raw
 * request body + STRIPE_WEBHOOK_SECRET, then mutates the org's billing
 * state via the service-role client (no user session exists for webhooks).
 *
 * Handled events:
 *   - checkout.session.completed      -> set customer id + subscription
 *   - customer.subscription.created   -> sync plan/status
 *   - customer.subscription.updated   -> sync plan/status
 *   - customer.subscription.deleted   -> revert to free
 *   - invoice.paid                    -> mark active
 *   - invoice.payment_failed          -> mark past_due
 *
 * @module app/api/billing/webhook/route
 */
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/billing/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { planForPriceId } from '@/lib/billing/prices';
import { logAudit } from '@/lib/audit/log';
import type { Json, Update } from '@/lib/supabase/rows';

type OrganizationUpdate = Update<'organizations'>;

// The webhook reads the raw body via req.text(); this requires the Node.js
// runtime (the Edge runtime would force streaming/JSON parsing instead).
export const runtime = 'nodejs';

type SubscriptionState = Pick<
  OrganizationUpdate,
  'stripe_subscription_id' | 'subscription_status' | 'current_period_end' | 'cancel_at_period_end'
>;

/**
 * Unix timestamp (seconds) when the current billing period ends.
 * Stripe reports this on the subscription in most API versions but moved it
 * onto the subscription items in newer ones, so read both shapes and ignore
 * anything that is not a number.
 */
function currentPeriodEnd(sub: Stripe.Subscription): number | undefined {
  const direct = (sub as { current_period_end?: unknown }).current_period_end;
  if (typeof direct === 'number') return direct;

  const item = (sub.items?.data?.[0] ?? undefined) as
    | { current_period_end?: unknown }
    | undefined;
  return typeof item?.current_period_end === 'number' ? item.current_period_end : undefined;
}

function subscriptionState(sub: Stripe.Subscription): SubscriptionState {
  const periodEnd = currentPeriodEnd(sub);
  return {
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
  };
}

async function orgIdForCustomer(customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.id ?? null;
}

async function writeBillingAudit(opts: {
  orgId: string | null;
  action: string;
  metadata: Json;
}) {
  if (!opts.orgId) {
    console.error('billing webhook could not resolve organization', opts.metadata);
    return;
  }
  await logAudit({
    orgId: opts.orgId,
    userId: null,
    actorLabel: 'stripe-webhook',
    action: opts.action,
    resource: 'billing',
    metadata: opts.metadata,
  });
}

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 501 });
  }

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

  // Idempotency: claim the event before mutating anything. A duplicate event
  // is acknowledged without applying it twice.
  const { error: claimError } = await supabaseAdmin
    .from('stripe_events')
    .insert({ id: event.id, type: event.type });

  if (claimError) {
    if (claimError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }
    console.error('failed to claim stripe event:', claimError);
    return NextResponse.json({ error: 'Could not record event' }, { status: 500 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.client_reference_id;
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null;

        if (!orgId) {
          throw new Error('checkout.session.completed missing client_reference_id');
        }

        let state: SubscriptionState | null = null;
        let planId: 'pro' | 'enterprise' | null = null;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          state = subscriptionState(sub);
          planId = planForPriceId(sub.items.data[0]?.price?.id) as 'pro' | 'enterprise' | null;
        }

        const updates: OrganizationUpdate = {
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
          ...(state ?? {}),
        };
        if (planId) updates.subscription_plan = planId;

        await supabaseAdmin.from('organizations').update(updates).eq('id', orgId);

        await writeBillingAudit({
          orgId,
          action: 'billing.subscription_created',
          metadata: { customerId, planId, subscriptionId },
        });
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;
        const orgId = await orgIdForCustomer(customerId);
        if (!orgId) throw new Error(`No organization for customer ${customerId ?? 'unknown'}`);

        const priceId = sub.items.data[0]?.price?.id;
        const planId = planForPriceId(priceId);
        const updates: OrganizationUpdate = {
          ...subscriptionState(sub),
          updated_at: new Date().toISOString(),
        };
        // An unknown price must not silently grant a paid plan.
        if (planId) updates.subscription_plan = planId;

        await supabaseAdmin.from('organizations').update(updates).eq('id', orgId);

        await writeBillingAudit({
          orgId,
          action: 'billing.subscription_updated',
          metadata: { customerId, planId, subscriptionId: sub.id, status: sub.status },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;
        const orgId = await orgIdForCustomer(customerId);
        if (!orgId) throw new Error(`No organization for customer ${customerId ?? 'unknown'}`);

        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_plan: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            current_period_end: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orgId);

        await writeBillingAudit({
          orgId,
          action: 'billing.subscription_cancelled',
          metadata: { customerId, subscriptionId: sub.id },
        });
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer?.id ?? null;
        const orgId = await orgIdForCustomer(customerId);
        if (!orgId) throw new Error(`No organization for customer ${customerId ?? 'unknown'}`);

        const paid = event.type === 'invoice.paid';
        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_status: paid ? 'active' : 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orgId);

        await writeBillingAudit({
          orgId,
          action: paid ? 'billing.invoice_paid' : 'billing.payment_failed',
          metadata: { customerId, invoiceId: invoice.id },
        });
        break;
      }

      default:
        // Unhandled event types are acknowledged so Stripe doesn't retry.
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    // Release the idempotency claim so Stripe's retry can process the event.
    await supabaseAdmin.from('stripe_events').delete().eq('id', event.id);
    console.error('billing webhook handler failed:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
