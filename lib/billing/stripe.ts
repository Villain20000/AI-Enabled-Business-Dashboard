/**
 * Stripe server client + helpers.
 *
 * @module lib/billing/stripe
 */
import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY || '';

export const stripe: Stripe | null = secretKey
  ? // Use the account's default API version (the SDK's types reflect the latest).
    // @ts-expect-error — `apiVersion: null` is valid at runtime but the SDK types require the latest version.
    new Stripe(secretKey, { apiVersion: null })
  : null;

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function createCheckoutSession(opts: {
  priceId: string;
  customerEmail: string;
  orgId: string;
}): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) return null;
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: opts.priceId, quantity: 1 }],
    customer_email: opts.customerEmail,
    success_url: `${APP_URL}/billing?status=success`,
    cancel_url: `${APP_URL}/billing?status=cancelled`,
    client_reference_id: opts.orgId,
    metadata: { org_id: opts.orgId },
  });
}

export async function createPortalSession(opts: {
  customerId: string;
}): Promise<Stripe.BillingPortal.Session | null> {
  if (!stripe) return null;
  return stripe.billingPortal.sessions.create({
    customer: opts.customerId,
    return_url: `${APP_URL}/billing`,
  });
}
