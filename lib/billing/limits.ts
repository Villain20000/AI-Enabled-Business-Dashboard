/**
 * Plan limit enforcement + feature flag resolution.
 *
 * Resolves the org's current plan, merges per-org feature flag overrides,
 * and exposes helpers to check features + numeric limits. Used by route
 * handlers (hard enforcement) and Server Components (UI gating).
 *
 * @module lib/billing/limits
 */
import { cache } from 'react';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPlan, type Plan } from './plans';

export interface OrgPlanContext {
  plan: Plan;
  features: Record<string, boolean>;
}

/**
 * Resolve the plan + effective feature flags for an org.
 * Cached per-request via React `cache`.
 */
export const getOrgPlan = cache(async (orgId: string): Promise<OrgPlanContext> => {
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('subscription_plan')
    .eq('id', orgId)
    .single();

  const plan = getPlan(org?.subscription_plan ?? 'free');

  // Merge per-org overrides (can only disable, never enable beyond plan).
  const { data: overrides } = await supabaseAdmin
    .from('feature_flags')
    .select('flag, enabled')
    .eq('org_id', orgId);

  const features = { ...plan.features };
  for (const o of overrides ?? []) {
    if (o.enabled === false) features[o.flag] = false;
  }

  return { plan, features };
});

export async function checkFeature(orgId: string, flag: string): Promise<boolean> {
  const { features } = await getOrgPlan(orgId);
  return features[flag] === true;
}

/**
 * Count today's AI usage events for an org and compare to the plan limit.
 */
export async function checkAiCallLimit(orgId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const { plan } = await getOrgPlan(orgId);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count } = await supabaseAdmin
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('event_type', 'ai_call')
    .gte('created_at', startOfDay.toISOString());

  const used = count ?? 0;
  return { allowed: used < plan.aiCallsPerDay, used, limit: plan.aiCallsPerDay };
}
