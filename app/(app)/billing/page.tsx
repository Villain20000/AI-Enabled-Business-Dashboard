/**
 * Billing Page — server entry point.
 *
 * Guards the route with the `billing:manage` permission (owner-only), then
 * loads the active org row to read its Stripe customer id + current plan.
 * Resolves the current plan definition via getPlan() and forwards the
 * `status` query param (set by Stripe checkout redirect) so the client
 * view can render a success/cancelled banner. Delegates all interactivity
 * to <BillingView />.
 *
 * @module app/(app)/billing/page
 */
import { requireOrg } from '@/lib/auth/requireOrg';
import { supabaseServer } from '@/lib/supabase/server';
import { getPlan, type PlanId } from '@/lib/billing/plans';
import { getPlanPriceIds } from '@/lib/billing/prices';
import { stripe } from '@/lib/billing/stripe';
import BillingView from './BillingView';

// Always render fresh — billing state must reflect live subscription data.
export const revalidate = 0;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  // Owner-only guard; redirects on failure.
  const ctx = await requireOrg('billing:manage');

  // Pull the org's Stripe linkage + active plan from the DB.
  const supabase = await supabaseServer();
  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id, subscription_plan, subscription_status, current_period_end, cancel_at_period_end')
    .eq('id', ctx.orgId)
    .single();

  const currentPlan = getPlan(org?.subscription_plan);
  const stripeCustomerId = org?.stripe_customer_id ?? null;
  const subscriptionStatus = (org?.subscription_status as string | null) ?? 'inactive';
  const currentPeriodEnd = (org?.current_period_end as string | null) ?? null;
  const cancelAtPeriodEnd = Boolean(org?.cancel_at_period_end);
  // Stripe is "configured" when the server client could be instantiated.
  const stripeEnabled = stripe !== null;
  // Resolve price IDs on the server; the client must never read process.env
  // for a non-public variable.
  const priceIds = getPlanPriceIds();

  // Await the searchParams promise (Next 15) for the redirect status flag.
  const { status } = await searchParams;
  const normalizedStatus =
    status === 'success' || status === 'cancelled' ? status : null;

  return (
    <BillingView
      orgId={ctx.orgId}
      currentPlanId={currentPlan.id as PlanId}
      stripeCustomerId={stripeCustomerId}
      stripeEnabled={stripeEnabled}
      status={normalizedStatus}
      priceIds={priceIds}
      subscriptionStatus={subscriptionStatus}
      currentPeriodEnd={currentPeriodEnd}
      cancelAtPeriodEnd={cancelAtPeriodEnd}
    />
  );
}
