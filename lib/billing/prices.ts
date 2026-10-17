/**
 * Server-side Stripe price resolution.
 *
 * `lib/billing/plans.ts` is imported by client components, so it must not read
 * non-public environment variables. Price IDs are resolved here and passed
 * into the billing UI as props.
 *
 * @module lib/billing/prices
 */
import type { PlanId } from './plans';

export type PriceIdMap = Partial<Record<PlanId, string>>;

function readPrice(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Configured Stripe price IDs keyed by plan. */
export function getPlanPriceIds(): PriceIdMap {
  return {
    pro: readPrice(process.env.STRIPE_PRICE_PRO),
    enterprise: readPrice(process.env.STRIPE_PRICE_ENTERPRISE),
  };
}

/** Return the plan associated with a configured price ID, or null. */
export function planForPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  const prices = getPlanPriceIds();
  for (const [planId, configuredPriceId] of Object.entries(prices)) {
    if (configuredPriceId === priceId) return planId as PlanId;
  }
  return null;
}

/** True when the supplied price ID belongs to one of our configured plans. */
export function isConfiguredPriceId(priceId: string): boolean {
  return planForPriceId(priceId) !== null;
}
