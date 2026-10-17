/**
 * BillingView — client view for the billing/subscription page.
 *
 * Renders the current plan summary, a full pricing grid (upgrade/downgrade
 * via Stripe Checkout), and a portal link when a Stripe customer exists.
 * Checkout/portal calls hit the /api/billing/* route handlers which return
 * a hosted Stripe `{ url }` to redirect to. When Stripe is unconfigured the
 * page falls back to a demo-mode banner. Errors surface as toasts.
 *
 * @module app/(app)/billing/BillingView
 */
'use client';

import { useState } from 'react';
import {
  CreditCard,
  Check,
  Crown,
  Zap,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/toast-context';
import { PLAN_LIST, PLANS, type Plan, type PlanId } from '@/lib/billing/plans';
import { apiFetch } from '@/lib/api/client';

interface BillingViewProps {
  orgId: string;
  currentPlanId: PlanId;
  stripeCustomerId: string | null;
  stripeEnabled: boolean;
  status: 'success' | 'cancelled' | null;
  /** Price IDs are resolved on the server and passed down; they are not
   *  secret, but reading process.env in a client bundle returns undefined. */
  priceIds: Partial<Record<PlanId, string>>;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

// Tier ordering used to label buttons as Upgrade vs Downgrade.
const PLAN_ORDER: PlanId[] = ['free', 'pro', 'enterprise'];

// Friendly labels for the feature-flag keys declared in plan definitions.
const FEATURE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard & analytics',
  alerts: 'Threshold alerts',
  ai_insights: 'AI-generated insights',
  nlq: 'Natural language queries',
  team: 'Team collaboration',
  api_keys: 'API keys',
  audit_log: 'Audit logging',
  sso: 'Single sign-on (SSO)',
  custom_data: 'Custom data sources',
};

/** Format an AI/day limit (MAX_SAFE_INTEGER => "Unlimited"). */
function formatAiLimit(n: number): string {
  return n >= Number.MAX_SAFE_INTEGER ? 'Unlimited' : n.toLocaleString();
}

export default function BillingView({
  currentPlanId,
  stripeCustomerId,
  stripeEnabled,
  status,
  priceIds,
  subscriptionStatus,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: BillingViewProps) {
  const { addToast } = useToast();
  const currentPlan = PLANS[currentPlanId];

  // Tracks which plan's checkout button is loading (by plan id), plus the
  // portal button. A null key means nothing is pending.
  const [loadingPlan, setLoadingPlan] = useState<PlanId | 'portal' | null>(
    null,
  );

  // Demo mode when there is no Stripe customer and Stripe isn't configured
  // (route handlers will refuse to create sessions in that case).
  const demoMode = !stripeCustomerId && !stripeEnabled;

  /**
   * Start a Stripe Checkout session for the selected plan and redirect to
   * the hosted URL returned by the route handler.
   */
  async function handleCheckout(plan: Plan) {
    const priceId = priceIds[plan.id];
    if (!priceId) return; // Enterprise / contact-sales path.

    // Existing customers change plans through Stripe's portal. This avoids
    // creating a second subscription and duplicate customer records.
    if (stripeCustomerId) {
      await handlePortal();
      return;
    }

    setLoadingPlan(plan.id);
    try {
      const res = await apiFetch('/api/billing/checkout', {
        method: 'POST',
        json: { priceId },
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to start checkout');
      }
      window.location.href = data.url;
    } catch (err) {
      addToast({
        title: 'Checkout failed',
        description:
          err instanceof Error ? err.message : 'Please try again.',
        type: 'error',
      });
      setLoadingPlan(null);
    }
  }

  /** Open the Stripe customer portal to manage payment / cancel. */
  async function handlePortal() {
    setLoadingPlan('portal');
    try {
      const res = await apiFetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to open billing portal');
      }
      window.location.href = data.url;
    } catch (err) {
      addToast({
        title: 'Portal unavailable',
        description:
          err instanceof Error ? err.message : 'Please try again.',
        type: 'error',
      });
      setLoadingPlan(null);
    }
  }

  const currentIndex = PLAN_ORDER.indexOf(currentPlanId);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      {/* Heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Billing
        </h1>
        <p className="text-sm text-slate-500">
          Manage your subscription, payment method, and plan limits.
        </p>
      </div>

      {/* Redirect status banners */}
      {status === 'success' && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Subscription updated successfully.
        </div>
      )}
      {status === 'cancelled' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Checkout was cancelled.
        </div>
      )}

      {subscriptionStatus === 'past_due' && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Payment failed. Update your payment method to keep this organization on its current plan.
        </div>
      )}

      {/* Demo-mode notice */}
      {demoMode && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Billing is in demo mode — configure Stripe to enable live
          subscriptions.
        </div>
      )}

      {/* Current plan summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            Current plan
          </CardTitle>
          <CardDescription>
            Your organization is currently on the {currentPlan.name} plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-lg font-semibold text-slate-900">
              {currentPlan.name}
            </span>
            <span className="text-sm text-slate-500">
              ${currentPlan.priceMonthly}/mo
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">Seats</dt>
              <dd className="font-medium text-slate-900">
                {currentPlan.seats}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">AI calls/day</dt>
              <dd className="font-medium text-slate-900">
                {formatAiLimit(currentPlan.aiCallsPerDay)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">API keys</dt>
              <dd className="font-medium text-slate-900">
                {currentPlan.apiKeys}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Audit retention</dt>
              <dd className="font-medium text-slate-900">
                {currentPlan.auditRetentionDays} days
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span>
              Status:{' '}
              <span className="font-medium capitalize text-slate-900">{subscriptionStatus}</span>
            </span>
            {currentPeriodEnd && (
              <span>
                {cancelAtPeriodEnd ? 'Ends' : 'Renews'} on{' '}
                {new Date(currentPeriodEnd).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Portal management link */}
          {stripeCustomerId && (
            <div className="mt-6">
              <Button
                variant="outline"
                onClick={handlePortal}
                disabled={loadingPlan === 'portal'}
              >
                {loadingPlan === 'portal' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Manage subscription
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Plans</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLAN_LIST.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const planIndex = PLAN_ORDER.indexOf(plan.id);
            const isUpgrade = planIndex > currentIndex;
            const isDowngrade = planIndex < currentIndex;
            const isLoading = loadingPlan === plan.id;
            const hasPrice = Boolean(priceIds[plan.id]);

            // Button label + variant by relationship to the current plan.
            let label = 'Current plan';
            let variant: 'default' | 'outline' = 'default';
            if (!isCurrent) {
              if (isUpgrade) label = 'Upgrade';
              else if (isDowngrade) label = 'Downgrade';
              variant = 'outline';
            }

            // Highlight the current plan + Pro tier.
            const isFeatured = plan.id === 'pro';

            return (
              <Card
                key={plan.id}
                className={
                  isCurrent
                    ? 'border-blue-600 ring-1 ring-blue-600'
                    : isFeatured
                      ? 'border-blue-200'
                      : ''
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {plan.id === 'enterprise' ? (
                        <Crown className="h-5 w-5 text-amber-500" />
                      ) : plan.id === 'pro' ? (
                        <Zap className="h-5 w-5 text-blue-600" />
                      ) : (
                        <CreditCard className="h-5 w-5 text-slate-400" />
                      )}
                      {plan.name}
                    </CardTitle>
                    {isCurrent && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Current
                      </span>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-2">
                    <span className="text-2xl font-semibold text-slate-900">
                      ${plan.priceMonthly}
                    </span>
                    <span className="text-sm text-slate-500">/mo</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Feature checklist — only enabled flags. */}
                  <ul className="space-y-2 text-sm">
                    {Object.entries(plan.features)
                      .filter(([, enabled]) => enabled)
                      .map(([flag]) => (
                        <li
                          key={flag}
                          className="flex items-start gap-2 text-slate-700"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          {FEATURE_LABELS[flag] ?? flag}
                        </li>
                      ))}
                  </ul>

                  {/* Action button */}
                  {hasPrice || plan.id === 'free' ? (
                    <Button
                      variant={variant}
                      className="w-full"
                      disabled={isCurrent || isLoading || (demoMode && plan.id !== 'free')}
                      onClick={() => {
                        if (plan.id === 'free') {
                          if (stripeCustomerId) void handlePortal();
                          else
                            addToast({
                              title: 'Already on Free',
                              description: 'There is no lower plan to downgrade to.',
                              type: 'info',
                            });
                          return;
                        }
                        void handleCheckout(plan);
                      }}
                    >
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {label}
                    </Button>
                  ) : (
                    // No Stripe price id — enterprise contact-sales path.
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={isCurrent}
                      onClick={() =>
                        addToast({
                          title: 'Contact sales',
                          description:
                            'Reach out to upgrade to the Enterprise plan.',
                          type: 'info',
                        })
                      }
                    >
                      Contact sales
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
