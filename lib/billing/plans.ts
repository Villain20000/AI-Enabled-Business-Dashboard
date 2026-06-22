/**
 * Subscription plan definitions.
 *
 * Each plan declares its Stripe price id, seat limit, AI call daily limit,
 * API key limit, audit retention days, and the feature flags it enables.
 * Per-org overrides in the `feature_flags` table can disable (never enable)
 * a plan's flags.
 *
 * @module lib/billing/plans
 */
export type PlanId = 'free' | 'pro' | 'enterprise';

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  stripePriceId?: string;
  seats: number;
  aiCallsPerDay: number;
  apiKeys: number;
  auditRetentionDays: number;
  features: Record<string, boolean>;
  description: string;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    seats: 1,
    aiCallsPerDay: 10,
    apiKeys: 0,
    auditRetentionDays: 7,
    description: 'For individuals exploring the dashboard.',
    features: {
      dashboard: true,
      alerts: true,
      ai_insights: false,
      nlq: true,
      team: false,
      api_keys: false,
      audit_log: false,
      sso: false,
      custom_data: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 49,
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    seats: 10,
    aiCallsPerDay: 1000,
    apiKeys: 5,
    auditRetentionDays: 90,
    description: 'For growing teams that need AI + collaboration.',
    features: {
      dashboard: true,
      alerts: true,
      ai_insights: true,
      nlq: true,
      team: true,
      api_keys: true,
      audit_log: true,
      sso: false,
      custom_data: true,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 299,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
    seats: 100,
    aiCallsPerDay: Number.MAX_SAFE_INTEGER,
    apiKeys: 100,
    auditRetentionDays: 3650,
    description: 'SSO, unlimited AI, full audit retention, priority support.',
    features: {
      dashboard: true,
      alerts: true,
      ai_insights: true,
      nlq: true,
      team: true,
      api_keys: true,
      audit_log: true,
      sso: true,
      custom_data: true,
    },
  },
};

export const PLAN_LIST = [PLANS.free, PLANS.pro, PLANS.enterprise];

export function getPlan(id: string | null | undefined): Plan {
  if (id && id in PLANS) return PLANS[id as PlanId];
  return PLANS.free;
}
